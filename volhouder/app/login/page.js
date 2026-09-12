"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "E-mailadres of wachtwoord klopt niet."
          : error.message
      );
      return;
    }

    const next = searchParams.get("next") || "/";
    router.push(next);
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <span className="auth-logo">Volhouder</span>
      <h1 style={{ marginBottom: 6 }}>Inloggen</h1>
      <p className="subtitle">
        Commitments die je écht nakomt, met een partner die meebeoordeelt en een straf die telt.
      </p>

      <div className="card">
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
              placeholder="jij@voorbeeld.com"
            />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="password">Wachtwoord</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", fontSize: 15 }}>
            {loading ? "Bezig..." : "Inloggen"}
          </button>
        </form>
      </div>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 16 }}>
        <Link href="/forgot-password">Wachtwoord vergeten?</Link>
        {" · "}
        <Link href={`/signup?next=${encodeURIComponent(searchParams.get("next") || "/")}`}>
          Registreer
        </Link>
      </p>
    </div>
  );
}
