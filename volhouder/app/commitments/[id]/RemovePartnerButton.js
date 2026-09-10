"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RemovePartnerButton({ commitmentId, profileId }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await supabase
      .from("commitment_partners")
      .delete()
      .eq("commitment_id", commitmentId)
      .eq("profile_id", profileId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button type="button" className="secondary" disabled={loading} onClick={handleClick}>
      {loading ? "Bezig..." : "Verwijder"}
    </button>
  );
}
