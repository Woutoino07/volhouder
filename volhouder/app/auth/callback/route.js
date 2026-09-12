import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Wisselt de inlogcode uit de e-maillink om voor een echte sessie en stuurt
// de gebruiker daarna door naar waar hij vandaan kwam (of naar /).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  // Voorkom open redirect: alleen relatieve paden zijn toegestaan.
  const safePath = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${safePath}`);
}
