"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="shell" style={{ paddingTop: 60 }}>
      <h1>Wachtwoord vergeten</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        {sent ? (
          <div className="notice-box">
            Check je mailbox — we stuurden een link naar <strong>{email}</strong> om een nieuw
            wachtwoord in te stellen.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="error-box">{error}</div>}
            <div className="field">
              <label htmlFor="email">E-mailadres</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Bezig..." : "Stuur resetlink"}
            </button>
          </form>
        )}
      </div>
      <p className="subtitle" style={{ marginTop: 16 }}>
        <Link href="/login">Terug naar inloggen</Link>
      </p>
    </div>
  );
}
