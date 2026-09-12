"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddPartnerForm({ commitmentId }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [link, setLink] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const token = crypto.randomUUID();

    const { error: inviteError } = await supabase.from("invites").insert({
      id: crypto.randomUUID(),
      commitment_id: commitmentId,
      email: email.trim(),
      token,
    });

    setLoading(false);

    if (inviteError) {
      setError(inviteError.message);
      return;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    setLink(`${siteUrl}/invite/${token}`);
  }

  if (link) {
    return (
      <div className="notice-box">
        Stuur deze link naar {email}: <br />
        <input
          type="text"
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          style={{ marginTop: 6 }}
        />
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setLink(null);
              setEmail("");
              router.refresh();
            }}
          >
            Nog iemand uitnodigen
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="row" style={{ alignItems: "flex-end" }}>
      {error && <div className="error-box" style={{ width: "100%" }}>{error}</div>}
      <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
        <label>Extra accountability-partner uitnodigen</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="naam@voorbeeld.com"
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Bezig..." : "Uitnodigen"}
      </button>
    </form>
  );
}
