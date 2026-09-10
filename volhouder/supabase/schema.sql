-- ============================================================================
-- Volhouder — database-schema (v2)
-- Voer dit volledige bestand één keer uit in de Supabase SQL Editor
-- (Project > SQL Editor > New query > plak dit erin > Run).
--
-- Wijzigingen t.o.v. v1, na een productdoorlichting:
--   - Meerdere accountability-partners per commitment in plaats van precies
--     één (het grootste risico van v1: één partner die het niet over zijn
--     hart krijgt om af te keuren, kon het hele systeem tandeloos maken).
--   - Een betwistingsflow ("ik ben het hier niet mee eens") voor een
--     afgekeurde of gemiste check-in.
--   - Uitnodigingslinks verlopen na 7 dagen.
--   - Zichtbare pauzedatum op een commitment (deactivated_at), zodat een
--     partner ziet wanneer en dat een commitment stopgezet is.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELLEN (zonder policies — die komen na de helper-functie hieronder,
-- want een policy kan enkel verwijzen naar een functie die al bestaat)
-- ----------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists commitments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text,
  frequency text not null check (frequency in ('daily', 'weekly', 'once')),
  days_of_week int[],              -- alleen bij frequency = 'weekly'; 0=zo .. 6=za
  once_date date,                   -- alleen bij frequency = 'once'
  deadline_time time not null,      -- bv. 06:45
  timezone text not null default 'Europe/Brussels',
  proof_type text not null check (proof_type in ('photo', 'checkbox', 'both')),
  money_stake numeric(10,2) not null default 0 check (money_stake >= 0),
  social_consequence boolean not null default true,
  active boolean not null default true,
  deactivated_at timestamptz,       -- zichtbaar voor partners: wanneer stopgezet
  created_at timestamptz not null default now()
);

-- Eén rij per accountability-partner van een commitment (kan er 0, 1 of meer
-- hebben — meer dan 1 verkleint het risico dat de enige partner nooit
-- afkeurt).
create table if not exists commitment_partners (
  commitment_id uuid not null references commitments (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (commitment_id, profile_id)
);

alter table profiles enable row level security;
alter table commitments enable row level security;
alter table commitment_partners enable row level security;

-- ----------------------------------------------------------------------------
-- 2. HELPER: is deze gebruiker eigenaar of partner van deze commitment?
-- security definer zodat de check zelf niet opnieuw tegen RLS aanloopt
-- (het standaardpatroon van Supabase voor dit soort lidmaatschapscontroles).
-- ----------------------------------------------------------------------------
create or replace function is_commitment_member(p_commitment_id uuid, p_uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from commitments c
    where c.id = p_commitment_id
      and (
        c.owner_id = p_uid
        or exists (
          select 1 from commitment_partners cp
          where cp.commitment_id = c.id and cp.profile_id = p_uid
        )
      )
  );
$$;

grant execute on function is_commitment_member(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. POLICIES: profielen, commitments, commitment_partners
-- ----------------------------------------------------------------------------
create policy "lees eigen profiel" on profiles
  for select using (auth.uid() = id);

create policy "lees profiel van commitment-leden" on profiles
  for select using (
    exists (
      select 1 from commitments c
      where is_commitment_member(c.id, auth.uid())
        and (
          c.owner_id = profiles.id
          or exists (
            select 1 from commitment_partners cp
            where cp.commitment_id = c.id and cp.profile_id = profiles.id
          )
        )
    )
  );

create policy "wijzig eigen profiel" on profiles
  for update using (auth.uid() = id);

create policy "maak eigen profiel aan" on profiles
  for insert with check (auth.uid() = id);

create policy "zie eigen of gedeelde commitments" on commitments
  for select using (is_commitment_member(id, auth.uid()));

create policy "maak eigen commitments" on commitments
  for insert with check (auth.uid() = owner_id);

create policy "wijzig eigen commitments" on commitments
  for update using (auth.uid() = owner_id);

create policy "verwijder eigen commitments" on commitments
  for delete using (auth.uid() = owner_id);

create policy "leden zien de partnerlijst" on commitment_partners
  for select using (is_commitment_member(commitment_id, auth.uid()));

create policy "eigenaar verwijdert een partner" on commitment_partners
  for delete using (
    exists (select 1 from commitments c where c.id = commitment_partners.commitment_id and c.owner_id = auth.uid())
  );

-- Profiel automatisch aanmaken bij eerste login
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. UITNODIGINGEN
-- Aanvaarden voegt de uitgenodigde toe aan commitment_partners. Een
-- commitment kan meerdere openstaande/aanvaarde uitnodigingen tegelijk
-- hebben. Links verlopen na 7 dagen.
-- ----------------------------------------------------------------------------
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references commitments (id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid(),
  accepted boolean not null default false,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table invites enable row level security;

create policy "eigenaar ziet eigen uitnodigingen" on invites
  for select using (
    exists (select 1 from commitments c where c.id = invites.commitment_id and c.owner_id = auth.uid())
  );

create policy "eigenaar maakt uitnodiging" on invites
  for insert with check (
    exists (select 1 from commitments c where c.id = invites.commitment_id and c.owner_id = auth.uid())
  );

-- Een uitnodiging accepteren mag ALLEEN via onderstaande functie (security
-- definer), zodat iemand alleen een uitnodiging kan aanvaarden die letterlijk
-- naar zijn eigen, geverifieerde e-mailadres verstuurd is én nog niet
-- verlopen is.
create or replace function accept_invite(invite_token uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite invites%rowtype;
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    raise exception 'Je moet ingelogd zijn om een uitnodiging te aanvaarden.';
  end if;

  select * into v_invite from invites where token = invite_token and accepted = false;
  if not found then
    raise exception 'Deze uitnodiging is ongeldig of al gebruikt.';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'Deze uitnodiging is verlopen. Vraag de eigenaar om een nieuwe link.';
  end if;

  if lower(v_invite.email) <> lower(v_email) then
    raise exception 'Deze uitnodiging staat op een ander e-mailadres (%) dan waarmee je bent ingelogd (%).', v_invite.email, v_email;
  end if;

  insert into commitment_partners (commitment_id, profile_id)
  values (v_invite.commitment_id, auth.uid())
  on conflict do nothing;

  update invites set accepted = true where id = v_invite.id;

  return v_invite.commitment_id;
end;
$$;

grant execute on function accept_invite(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. CHECK-INS
-- Eén rij per verplichte gelegenheid (meestal: één per dag) van een
-- commitment. Status 'disputed' is nieuw: de eigenaar kan een afgekeurde of
-- gemiste check-in betwisten; een partner beslecht de betwisting nadien.
-- ----------------------------------------------------------------------------
create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references commitments (id) on delete cascade,
  due_date date not null,
  due_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'approved', 'rejected', 'missed', 'disputed')),
  proof_note text,
  photo_path text,
  photo_deleted_at timestamptz,   -- gezet zodra de foto na 1 week automatisch verwijderd is
  submitted_at timestamptz,
  judged_by uuid references profiles (id),
  judged_at timestamptz,
  judgment_reason text,
  pre_dispute_status text,        -- status vóór een betwisting, om te kunnen herstellen
  dispute_reason text,
  disputed_at timestamptz,
  unique (commitment_id, due_date)
);

alter table check_ins enable row level security;

create policy "zie check-ins van leden" on check_ins
  for select using (is_commitment_member(commitment_id, auth.uid()));

create policy "leden mogen check-in aanmaken" on check_ins
  for insert with check (is_commitment_member(commitment_id, auth.uid()));

create policy "leden mogen check-in bijwerken" on check_ins
  for update using (is_commitment_member(commitment_id, auth.uid()));

-- ----------------------------------------------------------------------------
-- 6. SCHULDEN-LIJST (het geld-gedeelte van de straf)
-- Bij meerdere partners wordt de geldinzet gelijk over hen verdeeld.
-- ----------------------------------------------------------------------------
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid references check_ins (id) on delete set null,
  commitment_id uuid not null references commitments (id) on delete cascade,
  debtor_id uuid not null references profiles (id),
  creditor_id uuid not null references profiles (id),
  amount numeric(10,2) not null,
  settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table ledger_entries enable row level security;

create policy "zie eigen schulden" on ledger_entries
  for select using (auth.uid() = debtor_id or auth.uid() = creditor_id);

create policy "leden mogen schuld aanmaken" on ledger_entries
  for insert with check (is_commitment_member(commitment_id, auth.uid()));

create policy "betrokkenen markeren schuld als betaald" on ledger_entries
  for update using (auth.uid() = debtor_id or auth.uid() = creditor_id);

-- ----------------------------------------------------------------------------
-- 7. LOGICA: dagelijkse check-in aanmaken + verlopen check-ins afhandelen
-- Deze functies worden vanuit de app zelf aangeroepen (telkens iemand de
-- app opent), er is dus GEEN aparte cron-job of Edge Function nodig — dat
-- werkt ook gewoon op het gratis Supabase-plan.
-- ----------------------------------------------------------------------------

-- Zorgt dat er voor "vandaag" een check-in-rij bestaat voor een commitment,
-- als de commitment vandaag verplicht is. Geeft de (bestaande of nieuwe)
-- rij terug, of null als de commitment vandaag niet aan de beurt is.
create or replace function ensure_checkin_today(p_commitment_id uuid)
returns check_ins
language plpgsql
security invoker
as $$
declare
  v_commitment commitments%rowtype;
  v_local_date date;
  v_dow int;
  v_due boolean := false;
  v_due_at timestamptz;
  v_row check_ins%rowtype;
begin
  select * into v_commitment from commitments where id = p_commitment_id;
  if not found or not v_commitment.active then
    return null;
  end if;

  v_local_date := (now() at time zone v_commitment.timezone)::date;
  v_dow := extract(dow from v_local_date);

  if v_commitment.frequency = 'daily' then
    v_due := true;
  elsif v_commitment.frequency = 'weekly' and v_commitment.days_of_week is not null then
    v_due := v_dow = any(v_commitment.days_of_week);
  elsif v_commitment.frequency = 'once' then
    v_due := v_commitment.once_date = v_local_date;
  end if;

  if not v_due then
    return null;
  end if;

  v_due_at := (v_local_date::text || ' ' || v_commitment.deadline_time::text)::timestamp at time zone v_commitment.timezone;

  insert into check_ins (commitment_id, due_date, due_at, status)
  values (p_commitment_id, v_local_date, v_due_at, 'pending')
  on conflict (commitment_id, due_date) do nothing;

  select * into v_row from check_ins
  where commitment_id = p_commitment_id and due_date = v_local_date;

  return v_row;
end;
$$;

grant execute on function ensure_checkin_today(uuid) to authenticated;

-- Zet verlopen 'pending' check-ins op 'missed', keurt 'submitted' check-ins
-- automatisch goed na de wachttijd, en verdeelt de straf over alle partners
-- van de commitment. Wordt alleen uitgevoerd op check-ins van commitments
-- waar de ingelogde gebruiker zelf bij betrokken is — RLS regelt de rest.
create or replace function reconcile_my_checkins()
returns void
language plpgsql
security invoker
as $$
begin
  -- 1. Voorbij de deadline en niets ingediend => gemist (hard, geen oordeel nodig)
  update check_ins ci
  set status = 'missed'
  where is_commitment_member(ci.commitment_id, auth.uid())
    and ci.status = 'pending'
    and ci.due_at < now();

  -- 2. Ingediend en 24u lang niet afgekeurd door een partner => goedgekeurd
  update check_ins ci
  set status = 'approved'
  where is_commitment_member(ci.commitment_id, auth.uid())
    and ci.status = 'submitted'
    and ci.submitted_at < now() - interval '24 hours';

  -- 3. Straf aanmaken voor elke nieuw-gemiste check-in die nog geen schuld
  -- heeft, gelijk verdeeld over alle partners van die commitment.
  insert into ledger_entries (check_in_id, commitment_id, debtor_id, creditor_id, amount)
  select ci.id, ci.commitment_id, c.owner_id, cp.profile_id,
         round(c.money_stake / count(cp.profile_id) over (partition by ci.id), 2)
  from check_ins ci
  join commitments c on c.id = ci.commitment_id
  join commitment_partners cp on cp.commitment_id = c.id
  where is_commitment_member(ci.commitment_id, auth.uid())
    and ci.status = 'missed'
    and c.money_stake > 0
    and not exists (select 1 from ledger_entries le where le.check_in_id = ci.id);
end;
$$;

grant execute on function reconcile_my_checkins() to authenticated;

-- ----------------------------------------------------------------------------
-- 8. AFKEURING DOOR EEN PARTNER (elke partner mag afkeuren, niet de eigenaar)
-- ----------------------------------------------------------------------------
create or replace function reject_checkin(p_checkin_id uuid, p_reason text)
returns void
language plpgsql
security invoker
as $$
declare
  v_commitment commitments%rowtype;
  v_partner_count int;
begin
  select c.* into v_commitment
  from check_ins ci
  join commitments c on c.id = ci.commitment_id
  where ci.id = p_checkin_id;

  if not found then
    raise exception 'Check-in niet gevonden.';
  end if;

  if v_commitment.owner_id = auth.uid() or not is_commitment_member(v_commitment.id, auth.uid()) then
    raise exception 'Alleen een accountability-partner mag afkeuren.';
  end if;

  update check_ins
  set status = 'rejected',
      judged_by = auth.uid(),
      judged_at = now(),
      judgment_reason = p_reason
  where id = p_checkin_id;

  if v_commitment.money_stake > 0 then
    select count(*) into v_partner_count from commitment_partners where commitment_id = v_commitment.id;
    if v_partner_count > 0 then
      insert into ledger_entries (check_in_id, commitment_id, debtor_id, creditor_id, amount)
      select p_checkin_id, v_commitment.id, v_commitment.owner_id, cp.profile_id,
             round(v_commitment.money_stake / v_partner_count, 2)
      from commitment_partners cp
      where cp.commitment_id = v_commitment.id
      on conflict do nothing;
    end if;
  end if;
end;
$$;

grant execute on function reject_checkin(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 9. BETWISTING: de eigenaar kan het oneens zijn met een afkeuring of een
-- gemiste check-in; een partner beslecht dat nadien.
-- ----------------------------------------------------------------------------
-- security definer: deze functie verwijdert een schuld-rij (waar gewone
-- gebruikers geen delete-recht op hebben — bewust, om te vermijden dat
-- schulden zomaar weggeklikt kunnen worden) nadat ze zelf al gecontroleerd
-- heeft dat de aanroeper effectief de eigenaar is.
create or replace function dispute_checkin(p_checkin_id uuid, p_reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
  v_status text;
begin
  select c.owner_id, ci.status into v_owner, v_status
  from check_ins ci join commitments c on c.id = ci.commitment_id
  where ci.id = p_checkin_id;

  if not found or v_owner is distinct from auth.uid() then
    raise exception 'Alleen de eigenaar van de commitment kan dit betwisten.';
  end if;

  if v_status not in ('rejected', 'missed') then
    raise exception 'Enkel een afgekeurde of gemiste check-in kan betwist worden.';
  end if;

  update check_ins
  set status = 'disputed',
      pre_dispute_status = v_status,
      dispute_reason = p_reason,
      disputed_at = now()
  where id = p_checkin_id;

  -- De straf wordt opgeschort tot de betwisting beslecht is.
  delete from ledger_entries where check_in_id = p_checkin_id;
end;
$$;

grant execute on function dispute_checkin(uuid, text) to authenticated;

-- Een partner (niet de eigenaar) beslecht de betwisting: p_uphold = true
-- betekent "de eigenaar heeft toch gemist/terecht afgekeurd" (straf komt
-- terug), false betekent "de betwisting klopt" (telt alsnog als gelukt).
-- security definer: zelfde reden als dispute_checkin hierboven — de functie
-- controleert zelf dat de aanroeper een partner (niet de eigenaar) is.
create or replace function resolve_dispute(p_checkin_id uuid, p_uphold boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_commitment commitments%rowtype;
  v_pre_status text;
  v_partner_count int;
begin
  select c.* into v_commitment
  from check_ins ci join commitments c on c.id = ci.commitment_id
  where ci.id = p_checkin_id;

  if not found then
    raise exception 'Check-in niet gevonden.';
  end if;

  if v_commitment.owner_id = auth.uid() or not is_commitment_member(v_commitment.id, auth.uid()) then
    raise exception 'Alleen een accountability-partner mag een betwisting beslechten.';
  end if;

  select pre_dispute_status into v_pre_status from check_ins where id = p_checkin_id;

  if p_uphold then
    update check_ins
    set status = coalesce(v_pre_status, 'missed'),
        judged_by = auth.uid(),
        judged_at = now()
    where id = p_checkin_id;

    if v_commitment.money_stake > 0 then
      select count(*) into v_partner_count from commitment_partners where commitment_id = v_commitment.id;
      if v_partner_count > 0 then
        insert into ledger_entries (check_in_id, commitment_id, debtor_id, creditor_id, amount)
        select p_checkin_id, v_commitment.id, v_commitment.owner_id, cp.profile_id,
               round(v_commitment.money_stake / v_partner_count, 2)
        from commitment_partners cp
        where cp.commitment_id = v_commitment.id
        on conflict do nothing;
      end if;
    end if;
  else
    update check_ins
    set status = 'approved',
        judged_by = auth.uid(),
        judged_at = now()
    where id = p_checkin_id;
  end if;
end;
$$;

grant execute on function resolve_dispute(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- 10. PUSHMELDINGEN
-- Eén rij per toestel/browser dat een gebruiker heeft ingeschakeld.
-- ----------------------------------------------------------------------------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "eigen pushregistraties beheren" on push_subscriptions
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ----------------------------------------------------------------------------
-- 11. GLOBALE VERSIES VAN DE DAGELIJKSE LOGICA, VOOR DE CRON-JOB
-- De functies in sectie 7 werken enkel op check-ins van de ingelogde
-- gebruiker (RLS-vriendelijk, aanroepbaar vanuit de app). De cron-job heeft
-- geen ingelogde gebruiker — die draait via de service-role en moet ALLE
-- commitments in één keer verwerken. Bewust NIET gegrant aan `authenticated`:
-- enkel de service-role (dus enkel de cron-route) mag dit aanroepen.
-- ----------------------------------------------------------------------------
create or replace function generate_todays_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  v_local_date date;
  v_dow int;
  v_due boolean;
  v_due_at timestamptz;
begin
  for r in select * from commitments where active = true loop
    v_local_date := (now() at time zone r.timezone)::date;
    v_dow := extract(dow from v_local_date);
    v_due := false;

    if r.frequency = 'daily' then
      v_due := true;
    elsif r.frequency = 'weekly' and r.days_of_week is not null then
      v_due := v_dow = any(r.days_of_week);
    elsif r.frequency = 'once' then
      v_due := r.once_date = v_local_date;
    end if;

    if v_due then
      v_due_at := (v_local_date::text || ' ' || r.deadline_time::text)::timestamp at time zone r.timezone;
      insert into check_ins (commitment_id, due_date, due_at, status)
      values (r.id, v_local_date, v_due_at, 'pending')
      on conflict (commitment_id, due_date) do nothing;
    end if;
  end loop;
end;
$$;

create or replace function reconcile_all_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update check_ins set status = 'missed' where status = 'pending' and due_at < now();

  update check_ins set status = 'approved'
  where status = 'submitted' and submitted_at < now() - interval '24 hours';

  insert into ledger_entries (check_in_id, commitment_id, debtor_id, creditor_id, amount)
  select ci.id, ci.commitment_id, c.owner_id, cp.profile_id,
         round(c.money_stake / count(cp.profile_id) over (partition by ci.id), 2)
  from check_ins ci
  join commitments c on c.id = ci.commitment_id
  join commitment_partners cp on cp.commitment_id = c.id
  where ci.status = 'missed'
    and c.money_stake > 0
    and not exists (select 1 from ledger_entries le where le.check_in_id = ci.id);
end;
$$;

grant execute on function generate_todays_checkins() to service_role;
grant execute on function reconcile_all_checkins() to service_role;

-- ----------------------------------------------------------------------------
-- 12. STORAGE: bucket voor bewijsfoto's (privé, enkel zichtbaar voor leden
-- van de bijhorende commitment)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

create policy "leden zien bewijsfoto's"
on storage.objects for select
using (
  bucket_id = 'proofs'
  and is_commitment_member((storage.foldername(name))[1]::uuid, auth.uid())
);

create policy "eigenaar upload bewijsfoto's"
on storage.objects for insert
with check (
  bucket_id = 'proofs'
  and exists (
    select 1 from commitments c
    where c.id::text = (storage.foldername(name))[1]
      and c.owner_id = auth.uid()
  )
);

-- De eigenaar mag zijn eigen oude bewijsfoto's verwijderen (gebruikt door de
-- automatische opruiming na 1 week — zie lib/cleanupOldPhotos.js in de app).
create policy "eigenaar verwijdert eigen bewijsfoto's"
on storage.objects for delete
using (
  bucket_id = 'proofs'
  and exists (
    select 1 from commitments c
    where c.id::text = (storage.foldername(name))[1]
      and c.owner_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- 13. ECHTE UITBETALING VIA STRIPE CONNECT (optioneel — de app blijft ook
-- zonder Stripe volledig werken als een boekhouding, dit is een extra
-- mogelijkheid om een schuld ook meteen écht online te vereffenen).
-- Elke gebruiker kan een eigen Stripe Express-account koppelen om geld te
-- kunnen ONTVANGEN. De schuldenaar betaalt dan via Stripe Checkout en het
-- geld gaat rechtstreeks naar de rekening van de partner (geen commissie,
-- de app zelf houdt of ziet nooit geld vast).
-- ----------------------------------------------------------------------------
alter table profiles add column if not exists stripe_account_id text;
alter table profiles add column if not exists stripe_charges_enabled boolean not null default false;

-- Deze twee kolommen mogen ENKEL door server-side code met de service-role
-- key gewijzigd worden (na een echte controle bij Stripe zelf) — nooit
-- rechtstreeks door de gebruiker, ook al zou de bestaande
-- "wijzig eigen profiel"-policy dat toelaten. Deze trigger negeert elke
-- wijziging aan deze kolommen die niet van de service-role komt.
create or replace function protect_stripe_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.stripe_account_id := old.stripe_account_id;
    new.stripe_charges_enabled := old.stripe_charges_enabled;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_stripe_columns_trigger on profiles;
create trigger protect_stripe_columns_trigger
  before update on profiles
  for each row execute function protect_stripe_columns();

-- Hoe een schuld vereffend is: handmatig afgesproken (bv. cash, Payconiq) of
-- via een echte Stripe-betaling.
alter table ledger_entries add column if not exists settled_via text
  check (settled_via in ('manual', 'stripe'));
alter table ledger_entries add column if not exists stripe_checkout_session_id text;
