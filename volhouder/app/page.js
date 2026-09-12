import Link from "next/link";
import Nav from "@/components/Nav";
import NotificationSetup from "@/components/NotificationSetup";
import { createClient } from "@/lib/supabase/server";
import { cleanupOldPhotos } from "@/lib/cleanupOldPhotos";
import { computeStats } from "@/lib/stats";
import {
  CheckCircle2, XCircle, Clock, MinusCircle, Flame, Zap, Star, Plus, Target, User
} from "lucide-react";

const STATUS_LABEL = {
  pending: "nog te doen",
  submitted: "ingediend",
  approved: "gelukt",
  rejected: "afgekeurd",
  missed: "gemist",
  disputed: "betwist",
};

const FREQ_LABEL = {
  daily: "dagelijks",
  weekly: "wekelijks",
  once: "eenmalig",
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

function formatDate() {
  return new Date().toLocaleDateString("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function StatusIcon({ status, active }) {
  if (!active) return <MinusCircle size={14} strokeWidth={1.75} style={{ color: "var(--muted)" }} />;
  if (status === "pending") return <Flame size={14} strokeWidth={1.75} style={{ color: "var(--warning)" }} />;
  if (status === "submitted") return <Clock size={14} strokeWidth={1.75} style={{ color: "var(--muted)" }} />;
  if (status === "approved") return <CheckCircle2 size={14} strokeWidth={1.75} style={{ color: "var(--success)" }} />;
  if (status === "rejected" || status === "missed") return <XCircle size={14} strokeWidth={1.75} style={{ color: "var(--danger)" }} />;
  return null;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.rpc("reconcile_my_checkins");
  await cleanupOldPhotos(supabase, user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "jij";

  const { data: commitments, error } = await supabase
    .from("commitments")
    .select("*, owner:owner_id(display_name,email)")
    .order("created_at", { ascending: false });

  const rows = [];
  for (const c of commitments || []) {
    const [{ data: checkin }, { data: partnerRows }, { data: history }] = await Promise.all([
      c.active
        ? supabase.rpc("ensure_checkin_today", { p_commitment_id: c.id })
        : Promise.resolve({ data: null }),
      supabase
        .from("commitment_partners")
        .select("profile_id, profile:profile_id(display_name,email)")
        .eq("commitment_id", c.id),
      supabase
        .from("check_ins")
        .select("status")
        .eq("commitment_id", c.id)
        .order("due_date", { ascending: false })
        .limit(30),
    ]);
    const stats = computeStats(history || []);
    rows.push({ commitment: c, checkin, partners: partnerRows || [], stats });
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

  const totalStreak = rows.reduce((max, r) => Math.max(max, r.stats.streak || 0), 0);
  const totalSuccess = rows.reduce((sum, r) => sum + (r.stats.successCount || 0), 0);
  const totalCheckins = rows.reduce((sum, r) => sum + (r.stats.total || 0), 0);
  const overallRate = totalCheckins > 0 ? Math.round((totalSuccess / totalCheckins) * 100) : 0;

  return (
    <>
      <Nav pendingReviewCount={pendingReviewCount} />
      <div className="shell">
        <div className="page-header">
          <p className="greeting">{getGreeting()}, {displayName}</p>
          <p className="date-label" style={{ textTransform: "capitalize" }}>{formatDate()}</p>
        </div>

        <NotificationSetup />

        {error && <div className="error-box">{error.message}</div>}

        {rows.length > 0 && (
          <div className="stats-row">
            <div className="stat-chip">
              <div className="value" style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                {totalStreak === 0
                  ? <Zap size={16} strokeWidth={1.75} style={{ color: "var(--warning)" }} />
                  : totalStreak > 7
                  ? <><Flame size={16} strokeWidth={1.75} style={{ color: "var(--warning)" }} /> {totalStreak}</>
                  : totalStreak}
              </div>
              <div className="label">
                {totalStreak === 0 ? "Start vandaag" : totalStreak > 7 ? "dagen — geweldig!" : "Beste streak"}
              </div>
            </div>
            <div className="stat-chip">
              <div className="value" style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                {overallRate > 80 ? <><Star size={14} strokeWidth={1.75} style={{ color: "var(--warning)" }} /> {overallRate}%</> : `${overallRate}%`}
              </div>
              <div className="label">{overallRate > 80 ? "uitstekend" : "Slaagrate"}</div>
            </div>
            {owedByMe > 0 && (
              <div className="stat-chip">
                <div className="value" style={{ color: "var(--danger)" }}>€{owedByMe.toFixed(0)}</div>
                <div className="label">Verschuldigd</div>
              </div>
            )}
            {owedToMe > 0 && (
              <div className="stat-chip">
                <div className="value" style={{ color: "var(--success)" }}>€{owedToMe.toFixed(0)}</div>
                <div className="label">Tegoed</div>
              </div>
            )}
            <div className="stat-chip">
              <div className="value">{rows.length}</div>
              <div className="label">Commitments</div>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Target size={24} strokeWidth={1.75} />
              </div>
              <h3>Start je eerste commitment</h3>
              <p>Kies iets dat je wil volhouden. Een gewoonte, een doel, een belofte aan jezelf.</p>
              <Link href="/commitments/new" className="btn">Begin nu</Link>
            </div>
          </div>
        ) : (
          rows.map(({ commitment, checkin, partners, stats }) => {
            const isOwner = commitment.owner_id === user.id;
            const partnerLabel = isOwner
              ? partners.length > 0
                ? partners.map((p) => p.profile?.display_name || p.profile?.email).join(", ")
                : null
              : (commitment.owner?.display_name || commitment.owner?.email);

            const rate = stats.total > 0 ? Math.round((stats.successCount / stats.total) * 100) : 0;
            const isPending = checkin?.status === "pending";

            return (
              <Link
                key={commitment.id}
                href={`/commitments/${commitment.id}`}
                className="commitment-card"
              >
                <div className="commitment-card-header">
                  <span className="commitment-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {(checkin || !commitment.active) && (
                      <StatusIcon status={checkin?.status} active={commitment.active} />
                    )}
                    {commitment.title}
                  </span>
                  {!commitment.active ? (
                    <span className="badge paused">gepauzeerd</span>
                  ) : checkin ? (
                    <span className={`badge ${checkin.status}`}>{STATUS_LABEL[checkin.status]}</span>
                  ) : (
                    <span className="badge paused">niet vandaag</span>
                  )}
                </div>

                <div className="commitment-card-meta">
                  <span className="badge freq">{FREQ_LABEL[commitment.frequency]}</span>
                  <span className="badge freq" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Clock size={11} strokeWidth={1.75} />
                    {commitment.deadline_time?.slice(0, 5)}
                  </span>
                  {partnerLabel && (
                    <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <User size={11} strokeWidth={1.75} />
                      {partnerLabel}
                    </span>
                  )}
                </div>

                {stats.total > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        {stats.streak > 0
                          ? <><Flame size={11} strokeWidth={1.75} style={{ color: "var(--warning)" }} /> {stats.streak} dagen op rij</>
                          : "Nog geen streak"}
                      </span>
                      <span>{rate}%</span>
                    </div>
                    <div className="streak-bar">
                      <div
                        className={`streak-bar-fill${checkin?.status === "approved" ? " success" : ""}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                )}

                {isPending && commitment.active && (
                  <div style={{ marginTop: 12 }}>
                    <div className="btn-checkin">Check in</div>
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>

      <Link href="/commitments/new" className="fab" title="Nieuwe commitment">
        <Plus size={22} strokeWidth={2} />
      </Link>
    </>
  );
}
