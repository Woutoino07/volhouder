"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Pause, Play } from "lucide-react";

export default function PauseButton({ commitmentId, active }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function toggle() {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("commitments")
      .update(
        active
          ? { active: false, deactivated_at: new Date().toISOString() }
          : { active: true, deactivated_at: null }
      )
      .eq("id", commitmentId);
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
    setTimeout(() => router.refresh(), 1500);
  }

  if (success) return <span className="badge approved">Gedaan ✓</span>;

  return (
    <>
      {error && <div className="error-box">{error}</div>}
      <button type="button" className="secondary" disabled={loading} onClick={toggle} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {loading ? "Bezig..." : active
          ? <><Pause size={14} strokeWidth={1.75} /> Pauzeer deze commitment</>
          : <><Play size={14} strokeWidth={1.75} /> Hervat deze commitment</>}
      </button>
    </>
  );
}
