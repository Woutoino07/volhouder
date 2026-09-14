"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Check } from "lucide-react";

export default function DisplayNameEditor({ userId, initialName }) {
  const supabase = createClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    await supabase
      .from("profiles")
      .update({ display_name: name.trim() })
      .eq("id", userId);
    setEditing(false);
    setLoading(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          style={{ fontSize: 14, padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--glass-bg-strong)", color: "var(--text-primary)", fontFamily: "inherit", flex: 1, maxWidth: 200 }}
        />
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: 13, borderRadius: "var(--radius-pill)", background: "var(--navy)", color: "#fff", border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1 }}
        >
          <Check size={14} strokeWidth={1.75} />
          Opslaan
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
      <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{initialName || "—"}</span>
      <button
        onClick={() => setEditing(true)}
        style={{ display: "flex", alignItems: "center", padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", borderRadius: 4 }}
        title="Naam bewerken"
      >
        <Pencil size={13} strokeWidth={1.75} />
      </button>
    </div>
  );
}
