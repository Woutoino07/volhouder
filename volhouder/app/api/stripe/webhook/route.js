import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

// Stripe roept dit rechtstreeks aan (niet de browser) zodra een betaling
// écht voltooid is. Dit is de enige plek die een schuld automatisch op
// "betaald" mag zetten na een Stripe-betaling — nooit de browser zelf, want
// die kan je niet vertrouwen over of een betaling ook echt gelukt is.
export async function POST(request) {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe niet ingesteld." }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Ongeldige webhook: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const ledgerEntryId = session.metadata?.ledger_entry_id;
    if (ledgerEntryId) {
      const admin = createAdminClient();
      // Alleen bijwerken als nog niet afgehandeld — beschermt tegen Stripe
      // die dezelfde gebeurtenis soms meer dan eens aflevert.
      await admin
        .from("ledger_entries")
        .update({
          settled: true,
          settled_at: new Date().toISOString(),
          settled_via: "stripe",
        })
        .eq("id", ledgerEntryId)
        .eq("settled", false);
    }
  }

  return NextResponse.json({ received: true });
}
