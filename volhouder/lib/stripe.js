import Stripe from "stripe";

let cached = null;

// Geeft null terug als de eigenaar van de app nog geen Stripe heeft
// geconfigureerd — online betalen is een optionele extra, geen vereiste.
// Alle plekken die dit gebruiken moeten dat null-geval netjes afhandelen.
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return cached;
}
