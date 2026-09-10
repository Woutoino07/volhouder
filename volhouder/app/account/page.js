import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import ConnectStripeButton from "@/components/ConnectStripeButton";

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

  // Server component: process.env hier lezen lekt niets naar de browser.
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Account</h1>
        <p className="subtitle">{profile?.display_name || profile?.email}</p>

        <div className="card">
          <h2>Online betalen ontvangen</h2>
          {!stripeConfigured && (
            <p className="hint">
              Online betalen is nog niet ingesteld voor deze app. Schulden werken gewoon door als
              boekhouding — jullie spreken zelf af hoe je betaalt (bv. Payconiq) en markeren het
              dan als betaald op de schuldenpagina.
            </p>
          )}
          {stripeConfigured && profile?.stripe_charges_enabled && (
            <p>
              Online betalen staat aan. Als iemand jou iets verschuldigd is, kan die het
              rechtstreeks aan jou uitbetalen via Stripe — het geld komt zonder omweg op jouw
              rekening terecht.
            </p>
          )}
          {stripeConfigured && !profile?.stripe_charges_enabled && (
            <>
              <p>
                Koppel je eigen Stripe-account zodat partners een schuld aan jou meteen online
                kunnen uitbetalen, in plaats van dat jullie dat onderling moeten regelen. Dit is
                optioneel — zonder deze koppeling blijft de schuldenlijst gewoon werken, en spreek
                je zelf af hoe er betaald wordt.
              </p>
              <ConnectStripeButton
                label={profile?.stripe_account_id ? "Onboarding afronden" : "Stel online betalen in"}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
