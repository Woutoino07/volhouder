import Link from "next/link";
import Nav from "@/components/Nav";
import NotificationSetup from "@/components/NotificationSetup";
import { createClient } from "@/lib/supabase/server";
import { cleanupOldPhotos } from "@/lib/cleanupOldPhotos";
import { computeStats } from "@/lib/stats";
import {
  Flame, ChevronRight, Clock, Plus, Target, CheckCircle2,
  XCircle, AlertCircle, User,
} from "lucide-react";

const FREQ_LABEL = {
  daily: "Dagelijks",
  weekly: "Wekelijks",
  once: "Eenmalig",
};

const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Goedemorgen";
  if (h < 17) return "Goedemiddag";
  return "Goedenavond";
}

function getFullDate() {
  return new Date().toLocaleDateString("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Today Card ────────────────────────────────────
function TodayCard({ commitment, checkin, stats }) {
  const status = checkin?.status ?? "pending";
  const href = `/commitments/${commitment.id}`;

  let accentClass = "pending";
  if (status === "approved") accentClass = "approved";
  else if (status === "submitted") accentClass = "submitted";
  else if (status === "missed" || status === "rejected") accentClass = "missed";

  return (
    <Link href={href} className="today-card">
      <div className={`today-card-accent ${accentClass}`} />
      <div className="today-card-body">
        <div className="today-card-title">{commitment.title}</div>

        {status === "pending" && (
          <>
            <div className="today-card-meta">
              <span>{FREQ_LABEL[commitment.frequency]}</span>
              {commitment.deadline_time && (
                <>
                  <span>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Clock size={11} strokeWidth={1.75} />
                    vóór {commitment.deadline_time.slice(0, 5)}
                  </span>
                </>
              )}
            </div>
            <div className="today-card-footer">
              {stats.streak > 0 ? (
                <span className="streak-badge">
                  <Flame size={14} strokeWidth={2} />
                  {stats.streak} {stats.streak === 1 ? "dag" : "dagen"}
                </span>
              ) : (
                <span />
              )}
              <span className="checkin-cta">
                Check in
                <ChevronRight size={14} strokeWidth={2} />
              </span>
            </div>
          </>
        )}

        {status === "submitted" && (
          <>
            <div className="today-card-meta">
              <span>Ingediend · wacht op beoordeling</span>
            </div>
            {stats.total > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>
                  <span>Slaagrate</span>
                  <span>{stats.rate ?? 0}%</span>
                </div>
                <div className="streak-bar">
                  <div className="streak-bar-fill" style={{ width: `${stats.rate ?? 0}%` }} />
                </div>
              </div>
            )}
          </>
        )}

        {status === "approved" && (
          <div className="today-card-meta" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={13} strokeWidth={2} style={{ color: "var(--success)" }} />
            <span>Gelukt vandaag</span>
            {stats.streak > 0 && (
              <>
                <span>·</span>
                <span className="streak-badge">
                  <Flame size={13} strokeWidth={2} />
                  {stats.streak} {stats.streak === 1 ? "dag" : "dagen"} op rij
                </span>
              </>
            )}
          </div>
        )}

        {(status === "missed" || status === "rejected") && (
          <div className="today-card-meta" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <XCircle size={13} strokeWidth={2} style={{ color: "var(--muted)" }} />
            <span>Gemist · morgen is een nieuwe kans</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Progress Card ─────────────────────────────────
function ProgressCard({ commitment, history, stats }) {
  const last7 = getLast7Days();
  const today = getTodayStr();
  const historyMap = {};
  for (const h of history || []) {
    historyMap[h.due_date] = h.status;
  }

  return (
    <div className="progress-card">
      <div className="progress-card-header">
        <span className="progress-card-title">{commitment.title}</span>
        <div className="progress-card-stats">
          {stats.streak > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--warning)", fontWeight: 700 }}>
              <Flame size={12} strokeWidth={2} />
              {stats.streak}
            </span>
          )}
          {stats.rate !== null && <span>{stats.rate}%</span>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
        {/* Day labels row */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            {last7.map((dateStr) => {
              // Day of week: Mon=1 … Sun=0 in JS; map to 0=Ma … 6=Zo
              const d = new Date(dateStr + "T12:00:00");
              const jsDay = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
              const idx = jsDay === 0 ? 6 : jsDay - 1;
              return (
                <div
                  key={dateStr}
                  style={{
                    width: 28,
                    textAlign: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--muted-light)",
                    letterSpacing: 0,
                    flexShrink: 0,
                  }}
                >
                  {DAY_LABELS[idx]}
                </div>
              );
            })}
          </div>
          <div className="week-dots">
            {last7.map((dateStr) => {
              const status = historyMap[dateStr];
              let dotClass = "future";
              if (status === "approved") dotClass = "approved";
              else if (status === "missed" || status === "rejected") dotClass = "missed";
              else if (status === "submitted") dotClass = "submitted";
              else if (status === "pending" && dateStr === today) dotClass = "pending";
              else if (!status && dateStr < today) dotClass = "not-due";
              else if (!status && dateStr === today) dotClass = "pending";

              return (
                <div key={dateStr} className={`week-dot ${dotClass}`} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Not Today Item ────────────────────────────────
function NotTodayItem({ commitment }) {
  const nextLabel = commitment.frequency === "daily"
    ? "Morgen"
    : commitment.frequency === "weekly"
    ? "Volgende week"
    : "Eenmalig";

  return (
    <Link href={`/commitments/${commitment.id}`} className="not-today-item">
      <span style={{ fontWeight: 500 }}>{commitment.title}</span>
      <span className="not-today-next">{nextLabel}</span>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────
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

  const firstName = (profile?.display_name || user.email?.split("@")[0] || "jij").split(" ")[0];

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

  // History for progress cards (last 7 days)
  const activeCommitmentIds = (commitments || []).filter((c) => c.active).map((c) => c.id);
  let historyByCommitment = {};
  if (activeCommitmentIds.length > 0) {
    const { data: allHistory } = await supabase
      .from("check_ins")
      .select("commitment_id, due_date, status")
      .in("commitment_id", activeCommitmentIds)
      .gte("due_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .order("due_date", { ascending: false });

    for (const h of allHistory || []) {
      (historyByCommitment[h.commitment_id] ||= []).push(h);
    }
  }

  // Partner-review count
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

  // Ledger
  const { data: openDebts } = await supabase
    .from("ledger_entries")
    .select("amount, debtor_id")
    .eq("settled", false)
    .or(`debtor_id.eq.${user.id},creditor_id.eq.${user.id}`);

  const owedByMe = (openDebts || [])
    .filter((d) => d.debtor_id === user.id)
    .reduce((sum, d) => sum + Number(d.amount), 0);

  // Split rows
  const todayRows = rows.filter((r) => r.commitment.active && r.checkin);
  const notTodayRows = rows.filter((r) => r.commitment.active && !r.checkin);
  const activeRows = rows.filter((r) => r.commitment.active);

  return (
    <>
      <Nav pendingReviewCount={pendingReviewCount} />
      <div className="shell">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-greeting">{getGreeting()}, {firstName}</div>
          <div className="dashboard-date">{capitalize(getFullDate())}</div>
        </div>

        <NotificationSetup />

        {error && <div className="error-box">{error.message}</div>}

        {/* Debt banner */}
        {owedByMe > 0 && (
          <Link href="/ledger" className="debt-banner">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
              Je bent €{owedByMe.toFixed(2)} verschuldigd
            </span>
            <ChevronRight size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
          </Link>
        )}

        {/* Empty state */}
        {rows.length === 0 && (
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
        )}

        {/* Vandaag sectie */}
        {rows.length > 0 && (
          <>
            <div className="section-header">
              <span className="section-title">Vandaag</span>
              <span className="section-pill">
                {todayRows.length} {todayRows.length === 1 ? "commitment" : "commitments"}
              </span>
            </div>

            {todayRows.length === 0 && (
              <div style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius)",
                padding: "28px 20px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 14,
                marginBottom: 10,
                boxShadow: "var(--glass-shadow)",
              }}>
                Geen commitments vandaag — geniet ervan.
              </div>
            )}

            {todayRows.map(({ commitment, checkin, stats }) => (
              <TodayCard
                key={commitment.id}
                commitment={commitment}
                checkin={checkin}
                stats={stats}
              />
            ))}
          </>
        )}

        {/* Progressie sectie */}
        {activeRows.length > 0 && (
          <>
            <div className="section-header">
              <span className="section-title">Progressie</span>
              <Link href="/progress" className="section-subtitle">Alle inzichten →</Link>
            </div>

            {activeRows.map(({ commitment, stats }) => (
              <ProgressCard
                key={commitment.id}
                commitment={commitment}
                history={historyByCommitment[commitment.id] || []}
                stats={stats}
              />
            ))}
          </>
        )}

        {/* Niet vandaag sectie */}
        {notTodayRows.length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 28 }}>
              <span className="section-title" style={{ fontSize: 15, color: "var(--muted)" }}>Niet vandaag</span>
            </div>
            <div className="not-today-list">
              {notTodayRows.map(({ commitment }) => (
                <NotTodayItem key={commitment.id} commitment={commitment} />
              ))}
            </div>
          </>
        )}
      </div>

      <Link href="/commitments/new" className="fab" title="Nieuwe commitment">
        <Plus size={22} strokeWidth={2} />
      </Link>
    </>
  );
}
