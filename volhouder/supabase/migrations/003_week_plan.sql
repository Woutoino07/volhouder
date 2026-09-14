-- ============================================================================
-- Fase 2: Weekplanning — voer dit uit in de Supabase SQL Editor
--
-- Doel: een losse planningslaag bovenop bestaande commitments, zodat je ze
-- kan verslepen naar een dag in de week zonder de recurrence (days_of_week)
-- of de cron-gedreven check-in-generatie aan te raken. Puur additief.
-- ============================================================================

create table if not exists week_plan_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  commitment_id uuid not null references commitments (id) on delete cascade,
  planned_date date not null,
  planned_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (commitment_id, planned_date)
);

alter table week_plan_entries enable row level security;

create index if not exists week_plan_entries_owner_date_idx
  on week_plan_entries (owner_id, planned_date);

create policy "eigenaar leest eigen weekplanning" on week_plan_entries
  for select using (auth.uid() = owner_id);

create policy "eigenaar plant zelf in" on week_plan_entries
  for insert with check (auth.uid() = owner_id);

create policy "eigenaar wijzigt eigen weekplanning" on week_plan_entries
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "eigenaar verwijdert eigen weekplanning" on week_plan_entries
  for delete using (auth.uid() = owner_id);
