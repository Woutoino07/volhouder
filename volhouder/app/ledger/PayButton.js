"use client";

import { useState } from "react";

export default function PayButton({ entryId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Er ging iets mis.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <button type="button" disabled={loading} onClick={handleClick}>
        {loading ? "Bezig..." : "Betaal nu via Stripe"}
      </button>
    </div>
  );
}
