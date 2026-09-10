"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PauseButton({ commitmentId, active }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await supabase
      .from("commitments")
      .update(
        active
          ? { active: false, deactivated_at: new Date().toISOString() }
          : { active: true, deactivated_at: null }
      )
      .eq("id", commitmentId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button type="button" className="secondary" disabled={loading} onClick={toggle}>
      {loading ? "Bezig..." : active ? "Pauzeer deze commitment" : "Hervat deze commitment"}
    </button>
  );
}
