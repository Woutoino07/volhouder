"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, Cloud, CloudOff } from "lucide-react";

export default function ICloudConnect({ userId, appleId, lastError }) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleConnect(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: upsertError } = await supabase.from("icloud_accounts").upsert({
      owner_id: userId,
      apple_id: email,
      app_password: password,
      connected_at: new Date().toISOString(),
      last_error: null,
    });

    setLoading(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setPassword("");
    router.refresh();
  }

  async function handleDisconnect() {
    if (!confirm("iCloud-agenda ontkoppelen?")) return;
    setLoading(true);
    await supabase.from("icloud_accounts").delete().eq("owner_id", userId);
    setLoading(false);
    router.refresh();
  }

  if (appleId) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10, background: "var(--success-bg)",
            color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Cloud size={17} strokeWidth={1.75} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Gekoppeld</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{appleId}</div>
          </div>
        </div>

        {lastError && (
          <div className="error-box" style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12 }}>
            <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            Laatste sync mislukt: {lastError}. Controleer of het app-specifiek wachtwoord nog geldig is.
          </div>
        )}

        <button
          type="button"
          onClick={handleDisconnect}
          disabled={loading}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none",
            color: "var(--danger)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginTop: 4,
          }}
        >
          <CloudOff size={14} strokeWidth={1.75} />
          Ontkoppelen
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleConnect}>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label>Apple ID</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jij@icloud.com"
        />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>App-specifiek wachtwoord</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="xxxx-xxxx-xxxx-xxxx"
        />
        <div className="hint">
          Niet je gewone Apple-wachtwoord. Maak er een aan op{" "}
          <a href="https://appleid.apple.com" target="_blank" rel="noreferrer" style={{ color: "var(--navy-light)" }}>
            appleid.apple.com
          </a>{" "}
          → Aanmelden en beveiliging → App-specifieke wachtwoorden.
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn" style={{ marginTop: 14 }}>
        {loading ? "Bezig..." : "Koppelen"}
      </button>
    </form>
  );
}
