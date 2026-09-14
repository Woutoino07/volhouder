-- ============================================================================
-- Fase 1: Goals — voer dit uit in de Supabase SQL Editor
--
-- Doel: commitments kunnen optioneel onder een doel ("goal") hangen, als
-- eerste stap richting de Griply-achtige goal/habit/kalender-laag. Raakt
-- geen bestaande cron-, check-in- of RLS-logica: goal_id is nullable en
-- niets leest of schrijft er nog naar buiten deze migratie.
-- ============================================================================

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  color text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

alter table goals enable row level security;

create policy "eigenaar leest eigen doelen" on goals
  for select using (auth.uid() = owner_id);

create policy "eigenaar maakt doel aan" on goals
  for insert with check (auth.uid() = owner_id);

create policy "eigenaar wijzigt eigen doel" on goals
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "eigenaar verwijdert eigen doel" on goals
  for delete using (auth.uid() = owner_id);

-- Optionele koppeling: een commitment kan onder een doel hangen.
-- Nullable, dus geen impact op bestaande rijen of queries.
alter table commitments
  add column if not exists goal_id uuid references goals (id) on delete set null;
