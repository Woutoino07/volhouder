import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

// Start (of hervat) de koppeling van het eigen Stripe-account van de
// ingelogde gebruiker, zodat partners hem/haar rechtstreeks kunnen
// uitbetalen. Geeft een Stripe-onboardingslink terug om naartoe te sturen.
export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Online betalen is niet ingesteld door de beheerder van deze app." },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_account_id, email")
    .eq("id", user.id)
    .single();

  let accountId = profile?.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "BE",
      email: profile?.email || user.email,
      capabilities: {
        transfers: { requested: true },
      },
    });
    accountId = account.id;
    await admin.from("profiles").update({ stripe_account_id: accountId }).eq("id", user.id);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${siteUrl}/account`,
    return_url: `${siteUrl}/api/stripe/connect/return`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
