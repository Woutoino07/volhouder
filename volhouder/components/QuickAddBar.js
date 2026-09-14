"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function roundedTimeInOneHour() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const mins = d.getMinutes() < 30 ? "00" : "30";
  return `${String(d.getHours()).padStart(2, "0")}:${mins}`;
}

export default function QuickAddBar() {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("commitments").insert({
      id: crypto.randomUUID(),
      owner_id: user.id,
      title: title.trim(),
      frequency: "once",
      once_date: todayStr(),
      deadline_time: roundedTimeInOneHour(),
      proof_type: "checkbox",
      money_stake: 0,
      social_consequence: false,
    });

    setLoading(false);
    if (!error) {
      setTitle("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="quick-add-bar">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Snel iets toevoegen voor vandaag…"
      />
      <button type="submit" disabled={loading || !title.trim()} aria-label="Toevoegen">
        <Plus size={17} strokeWidth={2.25} />
      </button>
    </form>
  );
}
