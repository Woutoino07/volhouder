"use client";

import { createBrowserClient } from "@supabase/ssr";

// Eén Supabase-client voor gebruik in client components ("use client").
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
