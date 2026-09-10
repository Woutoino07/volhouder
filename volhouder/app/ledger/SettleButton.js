"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SettleButton({ entryId }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await supabase
      .from("ledger_entries")
      .update({ settled: true, settled_at: new Date().toISOString(), settled_via: "manual" })
      .eq("id", entryId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button type="button" className="secondary" disabled={loading} onClick={handleClick}>
      {loading ? "Bezig..." : "Markeer als betaald"}
    </button>
  );
}
