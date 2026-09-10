"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyEvent } from "@/lib/notify";

export default function ResolveDisputeButtons({ checkinId, commitmentId }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(null); // "uphold" | "overturn" | null
  const [error, setError] = useState(null);

  async function resolve(uphold) {
    setLoading(uphold ? "uphold" : "overturn");
    setError(null);
    const { error } = await supabase.rpc("resolve_dispute", {
      p_checkin_id: checkinId,
      p_uphold: uphold,
    });
    setLoading(null);
    if (error) {
      setError(error.message);
      return;
    }
    notifyEvent("resolved", commitmentId);
    router.refresh();
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <p className="hint">
        Beslecht deze betwisting: hield de straf terecht stand, of geef je de eigenaar gelijk?
      </p>
      <div className="row">
        <button type="button" className="danger" disabled={!!loading} onClick={() => resolve(true)}>
          {loading === "uphold" ? "Bezig..." : "Straf blijft staan"}
        </button>
        <button type="button" disabled={!!loading} onClick={() => resolve(false)}>
          {loading === "overturn" ? "Bezig..." : "Betwisting terecht — telt als gelukt"}
        </button>
      </div>
    </div>
  );
}
