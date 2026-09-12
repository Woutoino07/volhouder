-- ============================================================================
-- Security fixes — voer dit uit in de Supabase SQL Editor
-- ============================================================================

-- 1. UNIQUE constraint op invites.token
--    Voorkomt dat twee uitnodigingen hetzelfde token delen (on conflict
--    in accept_invite werkt anders dan bedoeld zonder deze constraint).
alter table invites add constraint invites_token_unique unique (token);

-- 2. UNIQUE constraint op ledger_entries (check_in_id, creditor_id)
--    Voorkomt dubbele straf-rijen bij retries of race-conditions in
--    reject_checkin, resolve_dispute en reconcile_all_checkins.
alter table ledger_entries
  add constraint ledger_entries_checkin_creditor_unique
  unique (check_in_id, creditor_id);

-- 3. Beperk directe UPDATE op check_ins
--    De huidige policy laat alle leden elke kolom updaten, inclusief status.
--    Alle check-in mutaties gaan via security-definer RPC-functies.
--    Verwijder de brede policy en vervang die door een lege (geen directe
--    updates toegestaan — alles loopt via reject_checkin / dispute_checkin /
--    resolve_dispute / ensure_checkin_today).
drop policy if exists "leden mogen check-in bijwerken" on check_ins;

-- Eigenaar mag alleen zijn eigen pending check-in submitting doen
-- (status pending -> submitted, proof_note, photo_path, submitted_at).
-- Partners mogen niets direct updaten — dat gaat via RPC.
create policy "eigenaar mag check-in indienen" on check_ins
  for update
  using (
    exists (
      select 1 from commitments c
      where c.id = check_ins.commitment_id and c.owner_id = auth.uid()
    )
    and status = 'pending'
  )
  with check (status = 'submitted');

-- 4. Beperk UPDATE op ledger_entries
--    Momenteel kunnen zowel debtor als creditor alle kolommen wijzigen.
--    Alleen de schuldenaar mag een entry als betaald markeren
--    (en alleen als die nog niet betaald is).
drop policy if exists "betrokkenen markeren schuld als betaald" on ledger_entries;

create policy "schuldenaar markeert schuld als betaald" on ledger_entries
  for update
  using (auth.uid() = debtor_id and settled = false)
  with check (settled = true);
