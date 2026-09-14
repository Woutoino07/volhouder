import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import {
  weeklySuccessTrend,
  moneyLostByMonth,
  stakeEffectiveness,
  reviewSpeedHours,
  debtBalanceByMonth,
  commitmentRanking,
} from "@/lib/progress";
import { TrendingUp, Coins, Clock, Scale, Trophy } from "lucide-react";

function ChartCard({ icon, title, subtitle, children }) {
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        {icon}
        <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
      </div>
      {subtitle && (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>{subtitle}</p>
      )}
      {children}
    </div>
  );
}

function BarRow({ bars, valueLabel }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 110 }}>
      {bars.map((b) => (
        <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
            <div
              title={valueLabel ? valueLabel(b) : String(b.value)}
              style={{
                width: "100%",
                height: `${b.value === null ? 2 : Math.max(3, (b.value / max) * 100)}%`,
                background: b.color || "var(--navy)",
                borderRadius: "4px 4px 0 0",
                opacity: b.value === null ? 0.15 : 1,
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: "var(--muted-light)", marginTop: 4 }}>{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function StakeCompare({ withStake, withoutStake }) {
  const rows = [
    { label: "Met geldinzet", ...withStake, color: "var(--navy)" },
    { label: "Zonder geldinzet", ...withoutStake, color: "var(--muted-light)" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
            <span>{r.label} {r.total > 0 && `(${r.total})`}</span>
            <span>{r.rate === null ? "—" : `${r.rate}%`}</span>
          </div>
          <div className="streak-bar">
            <div className="streak-bar-fill" style={{ width: `${r.rate ?? 0}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ProgressPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: commitments } = await supabase
    .from("commitments")
    .select("id, title, money_stake")
    .eq("owner_id", user.id);

  const commitmentIds = (commitments || []).map((c) => c.id);

  let checkIns = [];
  let ledgerEntries = [];
  if (commitmentIds.length > 0) {
    const [{ data: ciData }, { data: ledgerData }] = await Promise.all([
      supabase
        .from("check_ins")
        .select("commitment_id, due_date, status, submitted_at, judged_at")
        .in("commitment_id", commitmentIds),
      supabase
        .from("ledger_entries")
        .select("commitment_id, debtor_id, amount, settled, settled_at, created_at")
        .in("commitment_id", commitmentIds),
    ]);
    checkIns = ciData || [];
    ledgerEntries = ledgerData || [];
  }

  const trend = weeklySuccessTrend(checkIns);
  const moneyLost = moneyLostByMonth(ledgerEntries, user.id);
  const stakeEff = stakeEffectiveness(commitments || [], checkIns);
  const reviewHours = reviewSpeedHours(checkIns);
  const debtBalance = debtBalanceByMonth(ledgerEntries, user.id);
  const ranking = commitmentRanking(commitments || [], checkIns, ledgerEntries, user.id);

  const totalMoneyLost = moneyLost.reduce((sum, m) => sum + m.amount, 0);

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="dashboard-header">
          <div className="dashboard-greeting">Progressie</div>
          <div className="dashboard-date">Inzichten over al je commitments</div>
        </div>

        {(!commitments || commitments.length === 0) && (
          <div className="card">
            <div className="empty-state">
              <h3>Nog geen data</h3>
              <p>Zodra je een tijdje check-ins hebt, verschijnen hier grafieken.</p>
              <Link href="/commitments/new" className="btn">Nieuwe commitment</Link>
            </div>
          </div>
        )}

        {commitments && commitments.length > 0 && (
          <>
            <ChartCard
              icon={<TrendingUp size={16} strokeWidth={2} color="var(--navy)" />}
              title="Slaagpercentage-trend"
              subtitle="Laatste 8 weken"
            >
              <BarRow
                bars={trend.map((t) => ({
                  label: new Date(t.weekStart + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "numeric" }),
                  value: t.rate,
                }))}
                valueLabel={(b) => (b.value === null ? "geen data" : `${b.value}%`)}
              />
            </ChartCard>

            <ChartCard
              icon={<Coins size={16} strokeWidth={2} color="var(--danger)" />}
              title="Kost van missen"
              subtitle={`Laatste 6 maanden · totaal €${totalMoneyLost.toFixed(2)}`}
            >
              <BarRow
                bars={moneyLost.map((m) => ({ label: m.label, value: m.amount, color: "var(--danger)" }))}
                valueLabel={(b) => `€${b.value.toFixed(2)}`}
              />
            </ChartCard>

            <ChartCard
              icon={<Scale size={16} strokeWidth={2} color="var(--navy)" />}
              title="Geldinzet vs. geen inzet"
              subtitle="Werkt geld op het spel zetten voor jou?"
            >
              <StakeCompare withStake={stakeEff.withStake} withoutStake={stakeEff.withoutStake} />
            </ChartCard>

            <ChartCard
              icon={<Clock size={16} strokeWidth={2} color="var(--navy)" />}
              title="Beoordelingssnelheid van partners"
              subtitle="Gemiddelde tijd tussen indienen en beoordelen"
            >
              {reviewHours === null ? (
                <p style={{ fontSize: 13, color: "var(--muted)" }}>Nog geen beoordeelde check-ins.</p>
              ) : (
                <p style={{ fontSize: 24, fontWeight: 700 }}>
                  {reviewHours < 1 ? `${Math.round(reviewHours * 60)} min` : `${reviewHours.toFixed(1)} uur`}
                </p>
              )}
            </ChartCard>

            <ChartCard
              icon={<Coins size={16} strokeWidth={2} color="var(--warning)" />}
              title="Schuld: opgebouwd vs. afbetaald"
              subtitle="Per maand, laatste 6 maanden"
            >
              <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 11 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--danger)", display: "inline-block" }} />
                  opgebouwd
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--success)", display: "inline-block" }} />
                  afbetaald
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {debtBalance.map((m) => (
                  <div key={m.month} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 90, justifyContent: "center" }}>
                      <div style={{ width: 10, height: `${Math.max(2, (m.accrued / Math.max(1, ...debtBalance.map((x) => Math.max(x.accrued, x.settled)))) * 100)}%`, background: "var(--danger)", borderRadius: "3px 3px 0 0" }} title={`€${m.accrued.toFixed(2)} opgebouwd`} />
                      <div style={{ width: 10, height: `${Math.max(2, (m.settled / Math.max(1, ...debtBalance.map((x) => Math.max(x.accrued, x.settled)))) * 100)}%`, background: "var(--success)", borderRadius: "3px 3px 0 0" }} title={`€${m.settled.toFixed(2)} afbetaald`} />
                    </div>
                    <span style={{ fontSize: 10, color: "var(--muted-light)" }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard
              icon={<Trophy size={16} strokeWidth={2} color="var(--warning)" />}
              title="Ranking commitments"
              subtitle="Zwakste eerst — waar zit de meeste ruimte voor verbetering?"
            >
              {ranking.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>Nog geen beslechte check-ins.</p>}
              {ranking.map((r) => (
                <Link
                  key={r.id}
                  href={`/commitments/${r.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{r.title}</span>
                  <span style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--muted)" }}>
                    {r.moneyLost > 0 && <span>€{r.moneyLost.toFixed(2)}</span>}
                    <span style={{ fontWeight: 700, color: r.rate < 50 ? "var(--danger)" : "var(--text-primary)" }}>
                      {r.rate}%
                    </span>
                  </span>
                </Link>
              ))}
            </ChartCard>
          </>
        )}
      </div>
    </>
  );
}
