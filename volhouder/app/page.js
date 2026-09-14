import Link from "next/link";
import Nav from "@/components/Nav";
import NotificationSetup from "@/components/NotificationSetup";
import { createClient } from "@/lib/supabase/server";
import { cleanupOldPhotos } from "@/lib/cleanupOldPhotos";
import { computeStats } from "@/lib/stats";
import {
  Flame, Clock, Plus, Target, Camera, Check, X, AlertCircle, CalendarDays,
} from "lucide-react";
import { inferIcon } from "@/lib/icons";

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
  const Icon = inferIcon(commitment.title);

  return (
    <Link href={`/commitments/${commitment.id}`} className="today-card">
      <div className={`today-card-accent ${accentClass}`} />
      <div className="today-row-body">
        <span className="today-row-icon"><Icon size={16} strokeWidth={1.75} /></span>
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

// ── Progress ring — X/Y voltooid vandaag ───────────
function ProgressRing({ done, total }) {
  const size = 52;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  const offset = circumference * (1 - pct);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={pct >= 1 ? "var(--success)" : "var(--navy)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.3s" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--black)", lineHeight: 1 }}>{done}/{total}</span>
      </div>
    </div>
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
  const doneToday = rows.filter((r) => r.checkin?.status === "approved").length;

  return (
    <>
      <Nav pendingReviewCount={pendingReviewCount} />
      <div className="shell">
        <div className="dashboard-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="dashboard-greeting">{getGreeting()}, {firstName}</div>
            <div className="dashboard-date">{capitalize(getFullDate())}</div>
          </div>
          {rows.length > 0 && <ProgressRing done={doneToday} total={rows.length} />}
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
