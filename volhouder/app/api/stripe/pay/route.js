import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

// Maakt een Stripe Checkout-sessie aan zodat de schuldenaar een openstaande
// schuld rechtstreeks kan betalen aan de partner (transfer_data.destination
// stuurt het geld meteen naar diens Stripe-account, zonder commissie —
// de app zelf ziet dat geld nooit).
export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Online betalen is niet ingesteld door de beheerder van deze app." },
      { status: 400 }
    );
  }

  const { entryId } = await request.json();
  if (!entryId) {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Rechtstreeks via de admin-client opgehaald (bypasst RLS), maar we
  // controleren de rechten hierna zelf expliciet — enkel de schuldenaar zelf
  // mag deze betaling starten.
  const { data: entry } = await admin
    .from("ledger_entries")
    .select("id, debtor_id, creditor_id, amount, settled, commitments(title)")
    .eq("id", entryId)
    .single();

  if (!entry || entry.debtor_id !== user.id) {
    return NextResponse.json({ error: "Deze schuld is niet van jou om te betalen." }, { status: 403 });
  }
  if (entry.settled) {
    return NextResponse.json({ error: "Deze schuld staat al als betaald." }, { status: 400 });
  }

  const { data: creditor } = await admin
    .from("profiles")
    .select("stripe_account_id, stripe_charges_enabled, display_name, email")
    .eq("id", entry.creditor_id)
    .single();

  if (!creditor?.stripe_account_id || !creditor?.stripe_charges_enabled) {
    return NextResponse.json(
      {
        error: `${creditor?.display_name || creditor?.email || "Deze persoon"} heeft online betalen nog niet ingesteld. Spreek rechtstreeks af hoe je betaalt en markeer het dan als betaald.`,
      },
      { status: 400 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const amountInCents = Math.round(Number(entry.amount) * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "bancontact"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Volhouder — ${entry.commitments?.title || "gemiste commitment"}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      transfer_data: { destination: creditor.stripe_account_id },
    },
    metadata: { ledger_entry_id: entry.id },
    success_url: `${siteUrl}/ledger?paid=1`,
    cancel_url: `${siteUrl}/ledger`,
  });

  await admin
    .from("ledger_entries")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", entry.id);

  return NextResponse.json({ url: session.url });
}
