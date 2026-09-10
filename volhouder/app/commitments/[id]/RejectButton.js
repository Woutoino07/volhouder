"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyEvent } from "@/lib/notify";

export default function RejectButton({ checkinId, commitmentId }) {
  const router = useRouter();
  const supabase = createClient();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleReject() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("reject_checkin", {
      p_checkin_id: checkinId,
      p_reason: reason || null,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    notifyEvent("rejected", commitmentId);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="danger" onClick={() => setOpen(true)}>
        Afkeuren
      </button>
    );
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label>Waarom keur je dit af? (optioneel)</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="row">
        <button type="button" className="danger" disabled={loading} onClick={handleReject}>
          {loading ? "Bezig..." : "Bevestig afkeuring"}
        </button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
          Annuleer
        </button>
      </div>
    </div>
  );
}
