"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Nav() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="topbar">
      <div className="inner">
        <Link className="brand" href="/">
          Volhouder
        </Link>
        <div className="links">
          <Link href="/">Mijn commitments</Link>
          <Link href="/review">Te beoordelen</Link>
          <Link href="/ledger">Schulden</Link>
          <Link href="/wall">Overzicht missers</Link>
          <Link href="/account">Account</Link>
          <a href="#" onClick={(e) => { e.preventDefault(); signOut(); }}>
            Uitloggen
          </a>
        </div>
      </div>
    </nav>
  );
}
