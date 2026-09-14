"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const DAYS = [
  { value: 1, label: "ma" },
  { value: 2, label: "di" },
  { value: 3, label: "wo" },
  { value: 4, label: "do" },
  { value: 5, label: "vr" },
  { value: 6, label: "za" },
  { value: 0, label: "zo" },
];

export default function EditCommitmentForm({ commitment }) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(commitment.title);
  const [description, setDescription] = useState(commitment.description || "");
  const [frequency, setFrequency] = useState(commitment.frequency);
  const [daysOfWeek, setDaysOfWeek] = useState(commitment.days_of_week || [1, 2, 3, 4, 5]);
  const [onceDate, setOnceDate] = useState(commitment.once_date || "");
  const [deadlineTime, setDeadlineTime] = useState(commitment.deadline_time?.slice(0, 5) || "06:45");
  const [proofType, setProofType] = useState(commitment.proof_type);
  const [moneyStake, setMoneyStake] = useState(String(commitment.money_stake ?? "0"));
  const [socialConsequence, setSocialConsequence] = useState(commitment.social_consequence ?? true);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function toggleDay(day) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      title,
      description: description || null,
      frequency,
      days_of_week: frequency === "weekly" ? daysOfWeek : null,
      once_date: frequency === "once" ? onceDate : null,
      deadline_time: deadlineTime,
      proof_type: proofType,
      money_stake: Number(moneyStake) || 0,
      social_consequence: socialConsequence,
    };

    const { error: updateError } = await supabase
      .from("commitments")
      .update(payload)
      .eq("id", commitment.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push(`/commitments/${commitment.id}`);
  }

  return (
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
          />
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Omschrijving <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optioneel)</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label>Frequentie</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="daily">Elke dag</option>
            <option value="weekly">Bepaalde dagen van de week</option>
            <option value="once">Eenmalig</option>
          </select>
        </div>

        {frequency === "weekly" && (
          <div className="field">
            <label>Welke dagen?</label>
            <div className="days-grid">
              {DAYS.map((d) => (
                <button
                  type="button"
                  key={d.value}
                  className={`day-toggle ${daysOfWeek.includes(d.value) ? "active" : ""}`}
                  onClick={() => toggleDay(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {frequency === "once" && (
          <div className="field">
            <label>Datum</label>
            <input
              type="date"
              required
              value={onceDate}
              onChange={(e) => setOnceDate(e.target.value)}
            />
          </div>
        )}

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Deadline (Europe/Brussels)</label>
          <input
            type="time"
            required
            value={deadlineTime}
            onChange={(e) => setDeadlineTime(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label>Bewijs</label>
          <select value={proofType} onChange={(e) => setProofType(e.target.value)}>
            <option value="photo">Foto verplicht</option>
            <option value="checkbox">Simpel afvinken</option>
            <option value="both">Foto of afvinken</option>
          </select>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Geldinzet bij missen (€)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={moneyStake}
            onChange={(e) => setMoneyStake(e.target.value)}
          />
          <div className="hint">
            Wordt bijgehouden als schuld aan je partner. De app int niets automatisch.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <div className="checkbox-row">
            <input
              type="checkbox"
              id="social"
              checked={socialConsequence}
              onChange={(e) => setSocialConsequence(e.target.checked)}
            />
            <label htmlFor="social" style={{ marginBottom: 0, fontWeight: 400, fontSize: 14 }}>
              Toon missers op het gedeelde overzicht ("wall of shame")
            </label>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <button type="submit" disabled={loading} className="btn-full" style={{ flex: 1, padding: "14px", fontSize: 15, borderRadius: "var(--radius-pill)" }}>
          {loading ? "Bezig..." : "Wijzigingen opslaan"}
        </button>
        <Link href={`/commitments/${commitment.id}`} className="btn secondary" style={{ padding: "14px 20px", fontSize: 15, borderRadius: "var(--radius-pill)" }}>
          Annuleren
        </Link>
      </div>
    </form>
  );
}
