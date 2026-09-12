"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";

export default function ReviewActions({ checkinId }) {
  const supabase = createClient();
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("check_ins")
      .update({ status: "approved", judged_by: user.id, judged_at: new Date().toISOString() })
      .eq("id", checkinId);
    router.refresh();
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc("reject_checkin", {
      p_checkin_id: checkinId,
      p_judge_id: user.id,
      p_reason: reason.trim(),
    }).then(async ({ error }) => {
      if (error) {
        await supabase
          .from("check_ins")
          .update({ status: "rejected", judged_by: user.id, judged_at: new Date().toISOString(), rejection_reason: reason.trim() })
          .eq("id", checkinId);
      }
    });
    router.refresh();
  }

  if (rejecting) {
    return (
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reden voor afkeuring..."
          rows={2}
          style={{ fontSize: 13, padding: "8px 10px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", resize: "none", fontFamily: "inherit" }}
          autoFocus
        />
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleReject}
            disabled={loading || !reason.trim()}
            style={{ flex: 1, padding: "8px", fontSize: 13, borderRadius: "var(--radius)", background: "var(--danger)", color: "#fff", border: "none", cursor: "pointer", opacity: loading || !reason.trim() ? 0.6 : 1 }}
          >
            Bevestig afkeuring
          </button>
          <button
            onClick={() => { setRejecting(false); setReason(""); }}
            style={{ padding: "8px 12px", fontSize: 13, borderRadius: "var(--radius)", background: "var(--surface-secondary)", color: "var(--text)", border: "1px solid var(--border)", cursor: "pointer" }}
          >
            Annuleer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
      <button
        onClick={handleApprove}
        disabled={loading}
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", fontSize: 13, borderRadius: "var(--radius)", background: "var(--success)", color: "#fff", border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1 }}
      >
        <CheckCircle2 size={14} strokeWidth={1.75} />
        Nu goedkeuren
      </button>
      <button
        onClick={() => setRejecting(true)}
        disabled={loading}
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px", fontSize: 13, borderRadius: "var(--radius)", background: "transparent", color: "var(--danger)", border: "1px solid var(--danger)", cursor: "pointer", opacity: loading ? 0.6 : 1 }}
      >
        <XCircle size={14} strokeWidth={1.75} />
        Afkeuren
      </button>
    </div>
  );
}
