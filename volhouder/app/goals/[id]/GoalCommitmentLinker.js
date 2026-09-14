"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";

export default function GoalCommitmentLinker({ goalId, linked, unassigned }) {
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function link() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("commitments")
      .update({ goal_id: goalId })
      .eq("id", selected);
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSelected("");
    router.refresh();
  }

  async function unlink(commitmentId) {
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("commitments")
      .update({ goal_id: null })
      .eq("id", commitmentId);
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card">
      {error && <div className="error-box">{error}</div>}

      {linked.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 12px" }}>
          Nog geen commitments gekoppeld aan dit doel.
        </p>
      )}

      {linked.map((c) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontWeight: 500, fontSize: 14 }}>{c.title}</span>
          <button
            type="button"
            onClick={() => unlink(c.id)}
            disabled={loading}
            title="Ontkoppelen van dit doel"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      ))}

      {unassigned.length > 0 && (
        <div className="field" style={{ marginTop: linked.length > 0 ? 16 : 0, marginBottom: 0 }}>
          <label>Commitment koppelen</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Kies een commitment zonder doel…</option>
              {unassigned.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button type="button" onClick={link} disabled={!selected || loading} className="btn">
              Koppel
            </button>
          </div>
        </div>
      )}

      {unassigned.length === 0 && linked.length > 0 && (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0 0" }}>
          Al je andere commitments hebben al een doel.
        </p>
      )}
    </div>
  );
}
