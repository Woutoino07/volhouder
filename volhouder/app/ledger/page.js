import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import SettleButton from "./SettleButton";
import PayButton from "./PayButton";

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

  const owedByMe = open.filter((e) => e.debtor_id === user.id);
  const owedToMe = open.filter((e) => e.debtor_id !== user.id);

  function renderEntry(e) {
    const iAmDebtor = e.debtor_id === user.id;
    const otherPerson = iAmDebtor ? e.creditor : e.debtor;
    const canPayOnline = iAmDebtor && stripeConfigured && e.creditor?.stripe_charges_enabled;
    return (
      <div key={e.id} className="debt-item">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="debt-amount" style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)" }}>
              € {Number(e.amount).toFixed(2)}
            </div>
            <div className="debt-meta" style={{ marginTop: 4 }}>
              {iAmDebtor
                ? `aan ${otherPerson?.display_name || otherPerson?.email}`
                : `van ${otherPerson?.display_name || otherPerson?.email}`}
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
              <div className="empty-state-icon">💚</div>
              <h3>Geen openstaande schulden</h3>
              <p>Je staat er goed voor. Blijf je commitments nakomen!</p>
            </div>
          </div>
        )}

        {owedByMe.length > 0 && (
          <div className="card-section">
            <div className="card-section-header">
              <h2>Ik ben verschuldigd</h2>
            </div>
            {owedByMe.map(renderEntry)}
          </div>
        )}

        {owedToMe.length > 0 && (
          <div className="card-section">
            <div className="card-section-header">
              <h2>Aan mij verschuldigd</h2>
            </div>
            {owedToMe.map(renderEntry)}
          </div>
        )}

        {settled.length > 0 && (
          <div className="card-section">
            <div className="card-section-header">
              <h2>Afgehandeld</h2>
            </div>
            {settled.map(renderEntry)}
          </div>
        )}
      </div>
    </>
  );
}
