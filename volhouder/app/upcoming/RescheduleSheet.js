"use client";

import { useState } from "react";

export default function RescheduleSheet({ commitment, naturalDate, today, onClose, onSubmit }) {
  const [date, setDate] = useState(naturalDate);
  const [time, setTime] = useState(commitment.deadline_time?.slice(0, 5) || "08:00");
  const [applyToSeries, setApplyToSeries] = useState(false);
  const isRecurring = commitment.frequency !== "once";
  const isInvalid = new Date(`${date}T${time}:00`) < new Date();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 14 }}>Verplaats "{commitment.title}"</h3>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Datum</label>
            <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Tijd</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        {isInvalid && (
          <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>
            Dit tijdstip ligt in het verleden.
          </p>
        )}

        {isRecurring && (
          <div className="checkbox-row" style={{ marginBottom: 16 }}>
            <input
              type="checkbox"
              id="apply-series"
              checked={applyToSeries}
              onChange={(e) => setApplyToSeries(e.target.checked)}
            />
            <label htmlFor="apply-series" style={{ marginBottom: 0, fontWeight: 400, fontSize: 13 }}>
              Ook alle volgende keren (anders alleen deze dag)
            </label>
          </div>
        )}

        <button
          type="button"
          className="btn-full"
          style={{ width: "100%", marginBottom: 8 }}
          disabled={isInvalid}
          onClick={() => onSubmit(date, time, applyToSeries)}
        >
          Verplaatsen
        </button>
        <button type="button" onClick={onClose} style={{ width: "100%", background: "none", color: "var(--muted)", boxShadow: "none" }}>
          Annuleren
        </button>
      </div>
    </div>
  );
}
