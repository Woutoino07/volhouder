"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Je wachtwoord moet minstens 8 tekens lang zijn.");
      return;
    }
    if (password !== confirmPassword) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="shell" style={{ paddingTop: 60 }}>
      <h1>Nieuw wachtwoord instellen</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-box">{error}</div>}
          <div className="field">
            <label htmlFor="password">Nieuw wachtwoord</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Herhaal wachtwoord</label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Bezig..." : "Wachtwoord instellen"}
          </button>
        </form>
      </div>
    </div>
  );
}
