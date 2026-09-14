"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div>
      <button
        onClick={handleSignOut}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          fontSize: 14,
          fontWeight: 600,
          borderRadius: "var(--radius-pill)",
          background: "transparent",
          color: "var(--danger)",
          border: "1px solid var(--danger)",
          cursor: "pointer",
          opacity: loading ? 0.6 : 1,
          fontFamily: "inherit",
        }}
      >
        <LogOut size={15} strokeWidth={1.75} />
        {loading ? "Bezig..." : "Uitloggen"}
      </button>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0", paddingLeft: 2 }}>
        Je wordt uitgelogd op dit apparaat.
      </p>
    </div>
  );
}
