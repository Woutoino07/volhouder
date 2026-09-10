import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase-client voor gebruik in server components en route handlers.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Genegeerd: gebeurt wanneer setAll wordt aangeroepen vanuit een
            // server component. Dat is onschadelijk zolang middleware.js de
            // sessie ververst.
          }
        },
      },
    }
  );
}
