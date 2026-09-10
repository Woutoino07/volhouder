"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyEvent } from "@/lib/notify";

export default function DisputeButton({ checkinId, commitmentId }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!reason.trim()) {
      setError("Leg kort uit waarom je het hier niet mee eens bent.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("dispute_checkin", {
      p_checkin_id: checkinId,
      p_reason: reason,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    notifyEvent("disputed", commitmentId);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="secondary" onClick={() => setOpen(true)}>
        Ik ben het hier niet mee eens
      </button>
    );
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label>Waarom klopt dit volgens jou niet?</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="row">
        <button type="button" disabled={loading} onClick={handleSubmit}>
          {loading ? "Bezig..." : "Betwisting indienen"}
        </button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
          Annuleer
        </button>
      </div>
    </div>
  );
}
