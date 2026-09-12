"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RemovePartnerButton({ commitmentId, profileId }) {
  const router = useRouter();
  const supabase = createClient();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("commitment_partners")
      .delete()
      .eq("commitment_id", commitmentId)
      .eq("profile_id", profileId);
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
    setTimeout(() => router.refresh(), 1500);
  }

  if (success) return <span className="badge approved">Verwijderd ✓</span>;

  if (!confirm) {
    return (
      <button type="button" className="secondary" onClick={() => setConfirm(true)}>
        Verwijder
      </button>
    );
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <div className="row">
        <button type="button" className="danger" disabled={loading} onClick={handleClick}>
          {loading ? "Bezig..." : "Weet je het zeker?"}
        </button>
        <button type="button" className="secondary" onClick={() => setConfirm(false)}>
          Annuleer
        </button>
      </div>
    </div>
  );
}
