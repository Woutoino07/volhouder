"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TaskCheckButton({ commitmentId, date, status, className, children }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const rpc = status === "approved" ? "reopen_simple_checkin" : "complete_simple_checkin";
    await supabase.rpc(rpc, { p_commitment_id: commitmentId, p_date: date });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
      style={{ width: "100%", textAlign: "left", border: "none", background: "none", padding: 0, font: "inherit", cursor: "pointer" }}
    >
      {children}
    </button>
  );
}
