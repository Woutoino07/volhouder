import { createClient } from "@supabase/supabase-js";

// LET OP: deze client gebruikt de service-role key en omzeilt alle RLS.
// Enkel gebruiken in server-only code die zelf de nodige controles doet
// (de cron-route en de webhook-route) — NOOIT importeren in een client
// component of een gewone pagina.
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient mag nooit in de browser worden aangeroepen.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
