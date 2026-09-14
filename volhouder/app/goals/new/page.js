"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
import Link from "next/link";

export default function NewGoalPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const goalId = crypto.randomUUID();

    const { error: insertError } = await supabase.from("goals").insert({
      id: goalId,
      owner_id: user.id,
      title,
      description: description || null,
      target_date: targetDate || null,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/goals/${goalId}`);
  }

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="detail-header">
          <Link href="/goals" className="back-btn">←</Link>
          <h1>Nieuw doel</h1>
        </div>
        <p className="subtitle">Waarvoor dienen je commitments? Bv. "5km kunnen hardlopen".</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-box">{error}</div>}

          <div className="card">
            <div className="field">
              <label>Titel</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="5km kunnen hardlopen"
              />
            </div>

            <div className="field">
              <label>Omschrijving <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optioneel)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Waarom dit doel, en wat telt als geslaagd?"
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Streefdatum <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optioneel)</span></label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-full" style={{ width: "100%", padding: "14px", fontSize: 15, borderRadius: "var(--radius)", marginBottom: 24 }}>
            {loading ? "Bezig..." : "Doel aanmaken"}
          </button>
        </form>
      </div>
    </>
  );
}
