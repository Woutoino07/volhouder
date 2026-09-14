-- ============================================================================
-- Fase iCloud: koppeling met de Apple-agenda (CalDAV) — voer dit uit in de
-- Supabase SQL Editor.
--
-- Sla het app-specifiek wachtwoord op zodat de server (nooit de browser)
-- namens de gebruiker CalDAV kan bevragen. RLS beperkt lezen/schrijven tot
-- de eigenaar zelf, net als bij elke andere tabel in dit schema.
-- ============================================================================

create table if not exists icloud_accounts (
  owner_id uuid primary key references profiles (id) on delete cascade,
  apple_id text not null,
  app_password text not null,
  connected_at timestamptz not null default now(),
  last_error text
);

alter table icloud_accounts enable row level security;

create policy "eigenaar leest eigen icloud-koppeling" on icloud_accounts
  for select using (auth.uid() = owner_id);

create policy "eigenaar maakt icloud-koppeling" on icloud_accounts
  for insert with check (auth.uid() = owner_id);

create policy "eigenaar wijzigt eigen icloud-koppeling" on icloud_accounts
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "eigenaar verwijdert eigen icloud-koppeling" on icloud_accounts
  for delete using (auth.uid() = owner_id);
