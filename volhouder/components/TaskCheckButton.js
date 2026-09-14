"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export default function TaskCheckButton({ commitmentId, date, status, className, children, index }) {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const [localStatus, setLocalStatus] = useState(status);
  const [popping, setPopping] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const willComplete = localStatus !== "approved";
    setLocalStatus(willComplete ? "approved" : "pending");
    if (willComplete) {
      setPopping(true);
      window.setTimeout(() => setPopping(false), 260);
    }
    setLoading(true);
    const rpc = willComplete ? "complete_simple_checkin" : "reopen_simple_checkin";
    await supabase.rpc(rpc, { p_commitment_id: commitmentId, p_date: date });
    setLoading(false);
    if (willComplete) showToast("Voltooid — goed bezig!");
    router.refresh();
  }

  const accentClass = localStatus === "approved" ? "approved" : "pending";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
      style={{ width: "100%", textAlign: "left", border: "none", background: "none", padding: 0, font: "inherit", cursor: "pointer", "--stagger": index }}
    >
      <div className={`today-card-accent ${accentClass}`} />
      <div className="today-row-body">
        {children}
        <div className={`today-row-action ${accentClass} simple ${popping ? "pop" : ""}`}>
          {localStatus === "approved" && <Check size={20} strokeWidth={2.5} />}
        </div>
      </div>
    </button>
  );
}
