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

  function renderEntry(e) {
    const iAmDebtor = e.debtor_id === user.id;
    const otherPerson = iAmDebtor ? e.creditor : e.debtor;
    const canPayOnline = iAmDebtor && stripeConfigured && e.creditor?.stripe_charges_enabled;
    return (
      <div key={e.id} style={{ borderBottom: "1px solid var(--border)", padding: "12px 0" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div>
              {iAmDebtor ? "Jij bent" : `${otherPerson?.display_name || otherPerson?.email} is`}{" "}
              € {Number(e.amount).toFixed(2)} verschuldigd
              {!iAmDebtor && " aan jou"}
            </div>
            <div className="meta">
              {e.commitments?.title} · {new Date(e.created_at).toLocaleDateString("nl-BE")}
              {e.settled && e.settled_via === "stripe" && " · betaald via Stripe"}
            </div>
          </div>
          {!e.settled && (
            <div className="row" style={{ gap: 8 }}>
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
        <h1>Schulden</h1>
        <p className="subtitle">
          De app rekent zelf niets verplicht af — dit is in de eerste plaats de boekhouding.
          {stripeConfigured && (
            <>
              {" "}
              Wil je een schuld meteen online kunnen ontvangen in plaats van het onderling te
              regelen? Stel dat in op je <Link href="/account">accountpagina</Link>.
            </>
          )}
        </p>

        {error && <div className="error-box">{error.message}</div>}

        <div className="card">
          <h2>Openstaand</h2>
          {open.length === 0 && <div className="empty">Niets openstaand — goed bezig.</div>}
          {open.map(renderEntry)}
        </div>

        {settled.length > 0 && (
          <div className="card">
            <h2>Afgehandeld</h2>
            {settled.map(renderEntry)}
          </div>
        )}
      </div>
    </>
  );
}
