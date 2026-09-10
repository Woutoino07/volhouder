import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

// Deze route heeft altijd de actuele sessie/cookies nodig (en doet bij elke
// aanroep een echte Stripe-opvraging) — nooit statisch cachen.
export const dynamic = "force-dynamic";

// Stripe stuurt de gebruiker hierheen terug na het (al dan niet volledig
// afronden van het) onboardingsproces. Haalt de echte status bij Stripe op
// (nooit vertrouwen op wat de gebruiker zelf zou kunnen doorsturen) en zet
// die in het profiel.
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.redirect(`${siteUrl}/account`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_account_id) {
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    await admin
      .from("profiles")
      .update({ stripe_charges_enabled: !!account.charges_enabled })
      .eq("id", user.id);
  }

  return NextResponse.redirect(`${siteUrl}/account`);
}
