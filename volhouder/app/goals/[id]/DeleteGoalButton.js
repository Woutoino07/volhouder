"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";

export default function DeleteGoalButton({ goalId }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Doel verwijderen? Gekoppelde commitments blijven bestaan, ze verliezen enkel de koppeling.")) {
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("goals").delete().eq("id", goalId);
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.push("/goals");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        color: "var(--danger)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        padding: 0,
      }}
    >
      <Trash2 size={14} strokeWidth={1.75} />
      Doel verwijderen
    </button>
  );
}
