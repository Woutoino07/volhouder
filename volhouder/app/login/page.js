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
    <div className="shell" style={{ paddingTop: 60 }}>
      <h1>Volhouder</h1>
      <p className="subtitle">
        Commitments die je écht nakomt, met een partner die meebeoordeelt en een straf die telt.
      </p>

      <div className="card" style={{ maxWidth: 420 }}>
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
          <div className="field">
            <label htmlFor="password">Wachtwoord</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button type="submit" disabled={loading}>
              {loading ? "Bezig..." : "Inloggen"}
            </button>
            <Link href="/forgot-password" style={{ fontSize: 13 }}>
              Wachtwoord vergeten?
            </Link>
          </div>
        </form>
      </div>

      <p className="subtitle" style={{ marginTop: 16 }}>
        Nog geen account?{" "}
        <Link href={`/signup?next=${encodeURIComponent(searchParams.get("next") || "/")}`}>
          Registreer hier
        </Link>
        .
      </p>
    </div>
  );
}
