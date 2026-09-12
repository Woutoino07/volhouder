import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import SettleButton from "./SettleButton";
import PayButton from "./PayButton";
import LedgerCollapsible from "./LedgerCollapsible";
import { CheckCircle2 } from "lucide-react";

export default async function LedgerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  const { data: entries, error } = await supabase
    .from("ledger_entries")
    .select(
      "*, commitments(title), debtor:debtor_id(display_name,email), creditor:creditor_id(display_name,email,stripe_charges_enabled)"
    )
    .or(`debtor_id.eq.${user.id},creditor_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const open = (entries || []).filter((e) => !e.settled);
  const settled = (entries || []).filter((e) => e.settled);

  const owedByMeEntries = open.filter((e) => e.debtor_id === user.id);
  const owedToMeEntries = open.filter((e) => e.debtor_id !== user.id);

  const owedByMeTotal = owedByMeEntries.reduce((s, e) => s + Number(e.amount), 0);
  const owedToMeTotal = owedToMeEntries.reduce((s, e) => s + Number(e.amount), 0);

  function groupByPerson(entriesList, getPersonKey) {
    const map = new Map();
    for (const e of entriesList) {
      const person = getPersonKey(e);
      const key = person?.email || person?.display_name || "onbekend";
      if (!map.has(key)) map.set(key, { person, items: [] });
      map.get(key).items.push(e);
    }
    return [...map.values()];
  }

  const owedByMeGroups = groupByPerson(owedByMeEntries, (e) => e.creditor);
  const owedToMeGroups = groupByPerson(owedToMeEntries, (e) => e.debtor);

  function renderEntry(e) {
    const iAmDebtor = e.debtor_id === user.id;
    const canPayOnline = iAmDebtor && stripeConfigured && e.creditor?.stripe_charges_enabled;
    return (
      <div key={e.id} className="debt-item" style={{ paddingLeft: 16, borderLeft: "2px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="debt-amount" style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)" }}>
              € {Number(e.amount).toFixed(2)}
            </div>
            <div className="debt-meta">
              {e.commitments?.title} · {new Date(e.created_at).toLocaleDateString("nl-BE")}
            </div>
            {e.settled && e.settled_via === "stripe" && (
              <div className="debt-meta">Betaald via: Stripe</div>
            )}
          </div>
          {!e.settled && (
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {canPayOnline && <PayButton entryId={e.id} />}
              <SettleButton entryId={e.id} />
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderGroup(group) {
    const total = group.items.reduce((s, e) => s + Number(e.amount), 0);
    const name = group.person?.display_name || group.person?.email || "onbekend";
    return (
      <div key={name} className="debt-item">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: group.items.length > 1 ? 10 : 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "var(--navy)" }}>€ {total.toFixed(2)}</div>
        </div>
        {group.items.length > 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {group.items.map(renderEntry)}
          </div>
        )}
        {group.items.length === 1 && (() => {
          const e = group.items[0];
          const iAmDebtor = e.debtor_id === user.id;
          const canPayOnline = iAmDebtor && stripeConfigured && e.creditor?.stripe_charges_enabled;
          return (
            <div style={{ marginTop: 4 }}>
              <div className="debt-meta">
                {e.commitments?.title} · {new Date(e.created_at).toLocaleDateString("nl-BE")}
              </div>
              {!e.settled && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {canPayOnline && <PayButton entryId={e.id} />}
                  <SettleButton entryId={e.id} />
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="page-header">
          <h1>Schulden</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            De app rekent niets verplicht af — dit is de boekhouding.
            {stripeConfigured && (
              <>
                {" "}Stel <Link href="/account">online betalen</Link> in om schulden via Stripe te ontvangen.
              </>
            )}
          </p>
        </div>

        {error && <div className="error-box">{error.message}</div>}

        {open.length === 0 && settled.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><CheckCircle2 size={24} strokeWidth={1.75} /></div>
              <h3>Geen openstaande schulden</h3>
              <p>Je staat er goed voor. Blijf je commitments nakomen!</p>
            </div>
          </div>
        )}

        {open.length > 0 && (
          <div className="card">
            <div style={{ display: "flex", gap: 0 }}>
              <div style={{ flex: 1, textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--danger)" }}>
                  {owedByMeTotal > 0 ? `-€${owedByMeTotal.toFixed(2)}` : "€0,00"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>jij bent verschuldigd</div>
              </div>
              <div style={{ width: 1, background: "var(--border)", margin: "8px 0" }} />
              <div style={{ flex: 1, textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--success)" }}>
                  {owedToMeTotal > 0 ? `+€${owedToMeTotal.toFixed(2)}` : "€0,00"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>aan jou verschuldigd</div>
              </div>
            </div>
          </div>
        )}

        {owedByMeGroups.length > 0 && (
          <div className="card-section">
            <div className="card-section-header">
              <h2>Ik ben verschuldigd</h2>
            </div>
            {owedByMeGroups.map(renderGroup)}
          </div>
        )}

        {owedToMeGroups.length > 0 && (
          <div className="card-section">
            <div className="card-section-header">
              <h2>Aan mij verschuldigd</h2>
            </div>
            {owedToMeGroups.map(renderGroup)}
          </div>
        )}

        {settled.length > 0 && (
          <LedgerCollapsible count={settled.length}>
            {settled.map((e) => renderEntry(e))}
          </LedgerCollapsible>
        )}
      </div>
    </>
  );
}
