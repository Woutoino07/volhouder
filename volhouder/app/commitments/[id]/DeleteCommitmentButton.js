"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";

export default function DeleteCommitmentButton({ commitmentId }) {
  const router = useRouter();
  const supabase = createClient();

  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("commitments")
      .delete()
      .eq("id", commitmentId);

    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  if (confirming) {
    return (
      <div className="confirm-box">
        <p>Weet je het zeker? Dit verwijdert alle check-ins en geschiedenis.</p>
        {error && <div className="error-box" style={{ marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="danger" onClick={handleDelete} disabled={loading}>
            {loading ? "Bezig..." : "Ja, verwijder"}
          </button>
          <button className="secondary" onClick={() => setConfirming(false)} disabled={loading}>
            Annuleren
          </button>
        </div>
      </div>
    );
  }

  return (
    <button className="btn danger" onClick={() => setConfirming(true)} style={{ width: "100%", marginTop: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <Trash2 size={14} strokeWidth={1.75} /> Verwijderen
    </button>
  );
}
