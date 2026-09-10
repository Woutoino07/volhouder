"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // "confirm-email" | "logged-in"

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

    const next = searchParams.get("next") || "/";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      // E-mailbevestiging staat uit in dit Supabase-project: meteen ingelogd.
      window.location.href = next;
      return;
    }

    setDone("confirm-email");
  }

  if (done === "confirm-email") {
    return (
      <div className="shell" style={{ paddingTop: 60 }}>
        <h1>Bijna klaar</h1>
        <div className="card notice-box">
          We stuurden een bevestigingslink naar <strong>{email}</strong>. Klik erop om je account
          te activeren en in te loggen.
        </div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ paddingTop: 60 }}>
      <h1>Account aanmaken</h1>
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="hint">Minstens 8 tekens.</div>
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
            {loading ? "Bezig..." : "Account aanmaken"}
          </button>
        </form>
      </div>
      <p className="subtitle" style={{ marginTop: 16 }}>
        Heb je al een account?{" "}
        <Link href={`/login?next=${encodeURIComponent(searchParams.get("next") || "/")}`}>
          Log hier in
        </Link>
        .
      </p>
    </div>
  );
}
