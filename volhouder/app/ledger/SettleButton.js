"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SettleButton({ entryId }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const { error: supabaseError } = await supabase
      .from("ledger_entries")
      .update({ settled: true, settled_at: new Date().toISOString(), settled_via: "manual" })
      .eq("id", entryId);
    setLoading(false);
    if (supabaseError) {
      setError("Er ging iets mis. Probeer het opnieuw.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <button type="button" className="secondary" disabled={loading} onClick={handleClick}>
        {loading ? "Bezig..." : "Markeer als betaald"}
      </button>
    </div>
  );
}
