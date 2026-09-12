import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import ConnectStripeButton from "@/components/ConnectStripeButton";
import NotificationSetup from "@/components/NotificationSetup";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, stripe_account_id, stripe_charges_enabled")
    .eq("id", user.id)
    .single();

  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  const displayName = profile?.display_name || profile?.email || user.email || "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="page-header">
          <h1>Account</h1>
          <p className="subtitle" style={{ margin: 0 }}>{displayName}</p>
        </div>

        <div className="card">
          <h2>Profiel</h2>
          <div className="avatar">{initial}</div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>
            <div>{profile?.display_name || "—"}</div>
            <div>{profile?.email || user.email}</div>
          </div>
        </div>

        <NotificationSetup />

        {stripeConfigured && (
          <div className="card">
            <h2>Online betalen ontvangen</h2>
            {profile?.stripe_charges_enabled ? (
              <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
                Online betalen staat aan. Partners kunnen schulden rechtstreeks aan jou uitbetalen via Stripe.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 12px" }}>
                  Koppel je bankrekening om schulden direct online te ontvangen via Stripe.
                  Optioneel — zonder deze koppeling werkt de schuldenlijst gewoon.
                </p>
                <ConnectStripeButton
                  label={profile?.stripe_account_id ? "Onboarding afronden" : "Stel online betalen in"}
                />
              </>
            )}
          </div>
        )}

        {!stripeConfigured && (
          <div className="card">
            <h2>Online betalen</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
              Online betalen is niet ingesteld voor deze app. Schulden werken gewoon door als
              boekhouding — spreek onderling af hoe je betaalt (Payconiq, etc.) en markeer het
              daarna als afgehandeld.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
