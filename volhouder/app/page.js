import Link from "next/link";
import Nav from "@/components/Nav";
import NotificationSetup from "@/components/NotificationSetup";
import { createClient } from "@/lib/supabase/server";
import { cleanupOldPhotos } from "@/lib/cleanupOldPhotos";

const STATUS_LABEL = {
  pending: "nog te doen",
  submitted: "ingediend, wacht op partner",
  approved: "gelukt",
  rejected: "afgekeurd",
  missed: "gemist",
  disputed: "betwist",
};

const FREQ_LABEL = {
  daily: "elke dag",
  weekly: "wekelijks",
  once: "eenmalig",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Zet verlopen check-ins om naar 'missed'/'approved' en maak eventuele
  // straffen aan, vóór we iets tonen.
  await supabase.rpc("reconcile_my_checkins");
  await cleanupOldPhotos(supabase, user.id);

  // RLS beperkt dit al tot commitments waar ik eigenaar of partner van ben —
  // geen aparte .or()-filter nodig.
  // Bewust GEEN filter op active=true: een gepauzeerde commitment blijft
  // zichtbaar (met een duidelijk label) zodat een partner ook merkt dát en
  // wanneer die gepauzeerd is, in plaats van dat ze stilletjes verdwijnt.
  const { data: commitments, error } = await supabase
    .from("commitments")
    .select("*, owner:owner_id(display_name,email)")
    .order("created_at", { ascending: false });

  const rows = [];
  for (const c of commitments || []) {
    const [{ data: checkin }, { data: partnerRows }] = await Promise.all([
      c.active
        ? supabase.rpc("ensure_checkin_today", { p_commitment_id: c.id })
        : Promise.resolve({ data: null }),
      supabase
        .from("commitment_partners")
        .select("profile_id, profile:profile_id(display_name,email)")
        .eq("commitment_id", c.id),
    ]);
    rows.push({ commitment: c, checkin, partners: partnerRows || [] });
  }

  const { data: myPartnerCommitments } = await supabase
    .from("commitment_partners")
    .select("commitment_id")
    .eq("profile_id", user.id);
  const partnerCommitmentIds = (myPartnerCommitments || []).map((r) => r.commitment_id);

  let pendingReviewCount = 0;
  if (partnerCommitmentIds.length > 0) {
    const { count } = await supabase
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted")
      .in("commitment_id", partnerCommitmentIds);
    pendingReviewCount = count || 0;
  }

  const { data: openDebts } = await supabase
    .from("ledger_entries")
    .select("amount, debtor_id")
    .eq("settled", false)
    .or(`debtor_id.eq.${user.id},creditor_id.eq.${user.id}`);

  const owedByMe = (openDebts || [])
    .filter((d) => d.debtor_id === user.id)
    .reduce((sum, d) => sum + Number(d.amount), 0);
  const owedToMe = (openDebts || [])
    .filter((d) => d.debtor_id !== user.id)
    .reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Mijn commitments</h1>
        <p className="subtitle">Ingelogd als {user.email}</p>

        {error && <div className="error-box">{error.message}</div>}

        <NotificationSetup />

        <div className="row" style={{ marginBottom: 20 }}>
          <Link className="btn" href="/commitments/new">
            + Nieuwe commitment
          </Link>
          {pendingReviewCount > 0 && (
            <Link className="btn secondary" href="/review">
              {pendingReviewCount} te beoordelen
            </Link>
          )}
        </div>

        {(owedByMe > 0 || owedToMe > 0) && (
          <div className="card">
            <h2>Openstaande schulden</h2>
            {owedByMe > 0 && <p>Jij bent momenteel € {owedByMe.toFixed(2)} verschuldigd.</p>}
            {owedToMe > 0 && <p>Er staat € {owedToMe.toFixed(2)} open dat aan jou verschuldigd is.</p>}
            <Link href="/ledger">Bekijk details →</Link>
          </div>
        )}

        <div className="card">
          {rows.length === 0 && (
            <div className="empty">
              Je hebt nog geen commitments. Maak er hierboven één aan.
            </div>
          )}
          {rows.map(({ commitment, checkin, partners }) => {
            const isOwner = commitment.owner_id === user.id;
            const otherLabel = isOwner
              ? partners.length > 0
                ? `met ${partners.map((p) => p.profile?.display_name || p.profile?.email).join(", ")}`
                : "nog geen partner uitgenodigd"
              : `eigenaar: ${commitment.owner?.display_name || commitment.owner?.email}`;
            return (
              <Link
                key={commitment.id}
                href={`/commitments/${commitment.id}`}
                className="commitment-item"
              >
                <div>
                  <div>{commitment.title}</div>
                  <div className="meta">
                    {FREQ_LABEL[commitment.frequency]} · deadline {commitment.deadline_time?.slice(0, 5)} · {otherLabel}
                  </div>
                </div>
                {!commitment.active ? (
                  <span className="badge missed" style={{ background: "var(--border)", color: "var(--muted)" }}>
                    gepauzeerd
                  </span>
                ) : checkin ? (
                  <span className={`badge ${checkin.status}`}>{STATUS_LABEL[checkin.status]}</span>
                ) : (
                  <span className="meta">niet vandaag</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
