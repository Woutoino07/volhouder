-- ============================================================================
-- Fase: herplannen via drag-and-drop in de kalender — voer dit uit in de
-- Supabase SQL Editor.
--
-- Een commitment heeft van zichzelf maar één tijdstip (deadline_time) dat
-- voor alle voorkomens geldt. Om één specifiek voorkomen te kunnen
-- verslepen naar een andere dag/tijd zonder de hele reeks te raken, krijgt
-- check_ins twee optionele overschrijf-kolommen. Is er geen overschrijving,
-- dan geldt gewoon het normale patroon van de commitment (ongewijzigd
-- gedrag voor iedereen die nooit sleept).
-- ============================================================================

alter table check_ins add column if not exists rescheduled_date date;
alter table check_ins add column if not exists rescheduled_time time;

-- security definer naar het patroon van complete_simple_checkin/
-- set_commitment_time hierboven: controleert zelf eigenaarschap, en raakt
-- nooit een reeds beslechte check-in (alleen 'pending' mag verschuiven).
create or replace function reschedule_checkin(
  p_commitment_id uuid,
  p_original_date date,
  p_new_date date,       -- null = wis een bestaande overschrijving (undo)
  p_new_time time,       -- null = wis een bestaande overschrijving (undo)
  p_apply_to_series boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_commitment commitments%rowtype;
  v_due_at timestamptz;
begin
  select * into v_commitment from commitments where id = p_commitment_id;

  if not found then
    raise exception 'Commitment niet gevonden.';
  end if;

  if v_commitment.owner_id != auth.uid() then
    raise exception 'Alleen de eigenaar kan herplannen.';
  end if;

  if p_apply_to_series then
    -- "Deze en alle volgende": het algemene tijdstip verschuift, dus elk
    -- voorkomen zonder eigen overschrijving volgt vanzelf mee. Een eventuele
    -- eigen overschrijving op dit specifieke voorkomen wordt opgeruimd.
    update commitments set deadline_time = p_new_time where id = p_commitment_id;
    update check_ins set rescheduled_date = null, rescheduled_time = null
      where commitment_id = p_commitment_id and due_date = p_original_date;
    return;
  end if;

  v_due_at := (p_original_date::text || ' ' || v_commitment.deadline_time::text)::timestamp
    at time zone v_commitment.timezone;

  insert into check_ins (commitment_id, due_date, due_at, status, rescheduled_date, rescheduled_time)
  values (p_commitment_id, p_original_date, v_due_at, 'pending', p_new_date, p_new_time)
  on conflict (commitment_id, due_date) do update
    set rescheduled_date = excluded.rescheduled_date,
        rescheduled_time = excluded.rescheduled_time
    where check_ins.status = 'pending';
end;
$$;

grant execute on function reschedule_checkin(uuid, date, date, time, boolean) to authenticated;
