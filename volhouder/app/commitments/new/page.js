"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
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

const PROOF_OPTIONS = [
  { value: "photo", icon: "📷", label: "Foto", sub: "Foto verplicht" },
  { value: "checkbox", icon: "✓", label: "Checkbox", sub: "Simpel afvinken" },
  { value: "both", icon: "📷✓", label: "Beide", sub: "Foto of afvinken" },
];

const FREQ_OPTIONS = [
  { value: "daily", label: "Dagelijks" },
  { value: "weekly", label: "Wekelijks" },
  { value: "once", label: "Eénmalig" },
];

export default function NewCommitmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [daysOfWeek, setDaysOfWeek] = useState([1, 2, 3, 4, 5]);
  const [onceDate, setOnceDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("06:45");
  const [proofType, setProofType] = useState("photo");
  const [moneyStake, setMoneyStake] = useState("5");
  const [socialConsequence, setSocialConsequence] = useState(true);
  const [partnerEmails, setPartnerEmails] = useState("");

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inviteLinks, setInviteLinks] = useState(null);

  function toggleDay(day) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const commitmentId = crypto.randomUUID();

    const payload = {
      id: commitmentId,
      owner_id: user.id,
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

    const { error: insertError } = await supabase.from("commitments").insert(payload);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    const emails = partnerEmails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length > 0) {
      const rows = emails.map((email) => ({
        id: crypto.randomUUID(),
        commitment_id: commitmentId,
        email,
        token: crypto.randomUUID(),
      }));
      const { error: inviteError } = await supabase.from("invites").insert(rows);

      if (inviteError) {
        setError(
          "Commitment aangemaakt, maar de uitnodiging(en) kon(den) niet aangemaakt worden: " +
            inviteError.message
        );
        setLoading(false);
        return;
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      setInviteLinks(
        rows.map((row) => ({ email: row.email, link: `${siteUrl}/invite/${row.token}` }))
      );
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/commitments/${commitmentId}`);
  }

  if (inviteLinks) {
    return (
      <>
        <Nav />
        <div className="shell">
          <div className="detail-header">
            <Link href="/" className="back-btn">←</Link>
            <h1>Uitnodigingen</h1>
          </div>
          <div className="card">
            <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--muted)" }}>
              Stuur elke link door naar de bijbehorende persoon (WhatsApp, mail, etc.):
            </p>
            {inviteLinks.map((i) => (
              <div className="field" key={i.link}>
                <label>{i.email}</label>
                <input type="text" readOnly value={i.link} onFocus={(e) => e.target.select()} />
              </div>
            ))}
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0 16px" }}>
              Zodra iemand inlogt met dat e-mailadres en op zijn link klikt, wordt hij/zij je
              accountability-partner. Een link verloopt na 7 dagen.
            </p>
            <button onClick={() => router.push("/")}>Naar mijn commitments</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="detail-header">
          <Link href="/" className="back-btn">←</Link>
          <h1>Nieuwe commitment</h1>
        </div>
        <p className="subtitle">Wees specifiek — hoe concreter, hoe minder ruimte om te foezelen.</p>

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
                placeholder="Om 6:40 uit bed"
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Omschrijving <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optioneel)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Foto van mezelf rechtstaand in de keuken, binnen 5 minuten na het alarm."
              />
            </div>
          </div>

          <div className="card">
            <div className="field">
              <label>Frequentie</label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {FREQ_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFrequency(opt.value)}
                    style={{
                      flex: 1,
                      padding: "8px 6px",
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 20,
                      border: frequency === opt.value ? "none" : "1px solid var(--border)",
                      background: frequency === opt.value ? "var(--navy)" : "var(--bg-secondary)",
                      color: frequency === opt.value ? "#fff" : "var(--text-primary)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {PROOF_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setProofType(opt.value)}
                    style={{
                      flex: 1,
                      padding: "12px 8px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: "var(--radius)",
                      border: proofType === opt.value ? "2px solid var(--navy)" : "1px solid var(--border)",
                      background: proofType === opt.value ? "var(--navy)" : "var(--bg-secondary)",
                      color: proofType === opt.value ? "#fff" : "var(--text-primary)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{opt.icon}</span>
                    <span>{opt.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Geldinzet bij missen (€) <span style={{ fontWeight: 400, color: "var(--muted)" }}>(0 = geen inzet)</span></label>
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
            <div className="field">
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

            <div className="field" style={{ marginBottom: 0 }}>
              <label>
                Partner(s) uitnodigen{" "}
                <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optioneel — 0 partners = automatisch goedgekeurd na 24u)</span>
              </label>
              <textarea
                value={partnerEmails}
                onChange={(e) => setPartnerEmails(e.target.value)}
                placeholder={"naam@voorbeeld.com\nnog-iemand@voorbeeld.com"}
              />
              <div className="hint">
                Eén e-mailadres per lijn of gescheiden door een komma.
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-full" style={{ width: "100%", padding: "14px", fontSize: 15, borderRadius: "var(--radius)", marginBottom: 24 }}>
            {loading ? "Bezig..." : "Commitment aanmaken"}
          </button>
        </form>
      </div>
    </>
  );
}
