import Link from "next/link";
import Nav from "@/components/Nav";
import NotificationSetup from "@/components/NotificationSetup";
import { createClient } from "@/lib/supabase/server";
import { cleanupOldPhotos } from "@/lib/cleanupOldPhotos";
import { computeStats } from "@/lib/stats";
import {
  Flame, Clock, Plus, Target, Camera, Check, X, AlertCircle, CalendarDays,
} from "lucide-react";

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

const ACTION_ICON = {
  pending: <Camera size={19} strokeWidth={2} />,
  submitted: <Clock size={18} strokeWidth={2} />,
  approved: <Check size={20} strokeWidth={2.5} />,
  missed: <X size={18} strokeWidth={2} />,
};

// ── Today Row — simple: title + deadline left, action circle right ──
function TodayRow({ commitment, checkin, stats }) {
  const status = checkin?.status ?? "pending";
  const accentClass = status === "approved" ? "approved"
    : status === "submitted" ? "submitted"
    : (status === "missed" || status === "rejected") ? "missed"
    : "pending";

  return (
    <Link href={`/commitments/${commitment.id}`} className="today-card">
      <div className={`today-card-accent ${accentClass}`} />
      <div className="today-row-body">
        <div className="today-row-info">
          <div className="today-row-title">{commitment.title}</div>
          <div className="today-row-meta">
            {commitment.deadline_time && (
              <span className="deadline-pill">
                <Clock size={11} strokeWidth={2} />
                {commitment.deadline_time.slice(0, 5)}
              </span>
            )}
            {stats.streak > 0 && (
              <span className="streak-badge">
                <Flame size={13} strokeWidth={2} />
                {stats.streak}
              </span>
            )}
            {status === "submitted" && <span>Wacht op beoordeling</span>}
            {status === "approved" && <span>Gelukt vandaag</span>}
            {(status === "missed" || status === "rejected") && <span>Gemist</span>}
          </div>
        </div>
        <div className={`today-row-action ${accentClass}`}>
          {ACTION_ICON[accentClass]}
        </div>
      </div>
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
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const rows = [];
  for (const c of commitments || []) {
    const [{ data: checkin }, { data: history }] = await Promise.all([
      supabase.rpc("ensure_checkin_today", { p_commitment_id: c.id }),
      supabase
        .from("check_ins")
        .select("status")
        .eq("commitment_id", c.id)
        .order("due_date", { ascending: false })
        .limit(30),
    ]);
    if (!checkin) continue;
    const stats = computeStats(history || []);
    rows.push({ commitment: c, checkin, stats });
  }

  // Partner-review count (voor het badge-cijfer op de "Meer"-tab)
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

  const hasAnyCommitments = (commitments || []).length > 0;

  return (
    <>
      <Nav pendingReviewCount={pendingReviewCount} />
      <div className="shell">
        <div className="dashboard-header">
          <div className="dashboard-greeting">{getGreeting()}, {firstName}</div>
          <div className="dashboard-date">{capitalize(getFullDate())}</div>
        </div>

        <NotificationSetup />

        {error && <div className="error-box">{error.message}</div>}

        {owedByMe > 0 && (
          <Link href="/ledger" className="debt-banner">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
              Je bent €{owedByMe.toFixed(2)} verschuldigd
            </span>
          </Link>
        )}

        {!hasAnyCommitments && (
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

        {hasAnyCommitments && rows.length === 0 && (
          <div style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius)",
            padding: "36px 20px",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 14,
            boxShadow: "var(--glass-shadow)",
          }}>
            Niets vandaag — geniet ervan.
          </div>
        )}

        {rows.map(({ commitment, checkin, stats }) => (
          <TodayRow key={commitment.id} commitment={commitment} checkin={checkin} stats={stats} />
        ))}

        {hasAnyCommitments && (
          <Link
            href="/upcoming"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              marginTop: 16, padding: "12px", fontSize: 13, fontWeight: 600,
              color: "var(--muted)", textDecoration: "none",
            }}
          >
            <CalendarDays size={15} strokeWidth={2} />
            Bekijk aankomende dagen
          </Link>
        )}
      </div>

      <Link href="/commitments/new" className="fab" title="Nieuwe commitment">
        <Plus size={22} strokeWidth={2} />
      </Link>
    </>
  );
}
