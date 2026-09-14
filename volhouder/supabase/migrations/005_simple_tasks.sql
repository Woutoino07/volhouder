-- ============================================================================
-- Fase: simpele taken direct afvinken — voer dit uit in de Supabase SQL Editor
--
-- Een "simpele taak" = proof_type 'checkbox', geen geldinzet, geen partners
-- (precies wat /commitments/quick aanmaakt, en wat een gewone herhalende
-- gewoonte zonder inzet/partner is). Voor zo'n taak is er niemand om op te
-- wachten, dus de eigenaar mag ze zelf en meteen afronden — geen 24u-
-- wachttijd zoals bij een echte commitment met partnergoedkeuring.
--
-- Neemt (commitment_id, datum) i.p.v. een check_in-id, want in de
-- kalenderweek kan je een dag aanklikken waarvoor nog geen check_ins-rij
-- bestaat (die wordt normaal pas aangemaakt bij een bezoek aan Home via
-- ensure_checkin_today) — deze functie maakt 'm dan meteen aan.
--
-- security definer, naar het patroon van ensure_checkin_today/resolve_dispute
-- in dit schema: de functie controleert zelf eigenaarschap en "is dit wel
-- een simpele taak" vóór ze iets wijzigt, dus dit omzeilt geen echte controle
-- op commitments met geld of partners erbij.
-- ============================================================================

create or replace function complete_simple_checkin(p_commitment_id uuid, p_date date)
returns check_ins
language plpgsql
security definer set search_path = public
as $$
declare
  v_commitment commitments%rowtype;
  v_row check_ins%rowtype;
  v_partner_count int;
  v_due_at timestamptz;
begin
  select * into v_commitment from commitments where id = p_commitment_id;

  if not found then
    raise exception 'Commitment niet gevonden.';
  end if;

  if v_commitment.owner_id != auth.uid() then
    raise exception 'Alleen de eigenaar kan deze taak afvinken.';
  end if;

  select count(*) into v_partner_count from commitment_partners where commitment_id = v_commitment.id;

  if v_commitment.proof_type != 'checkbox' or v_commitment.money_stake > 0 or v_partner_count > 0 then
    raise exception 'Dit is een volledige commitment, geen simpele taak — vink af via de check-in flow.';
  end if;

  v_due_at := (p_date::text || ' ' || v_commitment.deadline_time::text)::timestamp at time zone v_commitment.timezone;

  insert into check_ins (commitment_id, due_date, due_at, status, submitted_at, judged_by, judged_at)
  values (p_commitment_id, p_date, v_due_at, 'approved', now(), auth.uid(), now())
  on conflict (commitment_id, due_date) do update
    set status = 'approved',
        submitted_at = coalesce(check_ins.submitted_at, now()),
        judged_by = auth.uid(),
        judged_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function complete_simple_checkin(uuid, date) to authenticated;

-- Tegenhanger: een simpele taak terug openzetten (per ongeluk aangevinkt).
create or replace function reopen_simple_checkin(p_commitment_id uuid, p_date date)
returns check_ins
language plpgsql
security definer set search_path = public
as $$
declare
  v_commitment commitments%rowtype;
  v_row check_ins%rowtype;
  v_partner_count int;
begin
  select * into v_commitment from commitments where id = p_commitment_id;

  if not found then
    raise exception 'Commitment niet gevonden.';
  end if;

  if v_commitment.owner_id != auth.uid() then
    raise exception 'Alleen de eigenaar kan deze taak heropenen.';
  end if;

  select count(*) into v_partner_count from commitment_partners where commitment_id = v_commitment.id;

  if v_commitment.proof_type != 'checkbox' or v_commitment.money_stake > 0 or v_partner_count > 0 then
    raise exception 'Dit is een volledige commitment, geen simpele taak.';
  end if;

  update check_ins
  set status = 'pending',
      submitted_at = null,
      judged_by = null,
      judged_at = null
  where commitment_id = p_commitment_id and due_date = p_date
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function reopen_simple_checkin(uuid, date) to authenticated;

-- De eigenaar mag het tijdstip van zijn eigen commitment verslepen naar een
-- ander uur (gebruikt door de "sleep gewoontes naar een tijdslot"-interactie
-- in de Aankomend-kalender). Dit wijzigt het tijdstip voor alle toekomstige
-- voorkomens, niet enkel die ene dag — er is geen los tijdstip per dag.
create or replace function set_commitment_time(p_commitment_id uuid, p_time time)
returns void
language sql
security definer set search_path = public
as $$
  update commitments
  set deadline_time = p_time
  where id = p_commitment_id and owner_id = auth.uid();
$$;

grant execute on function set_commitment_time(uuid, time) to authenticated;
