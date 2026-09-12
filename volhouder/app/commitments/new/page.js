"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Nav from "@/components/Nav";

const DAYS = [
  { value: 1, label: "ma" },
  { value: 2, label: "di" },
  { value: 3, label: "wo" },
  { value: 4, label: "do" },
  { value: 5, label: "vr" },
  { value: 6, label: "za" },
  { value: 0, label: "zo" },
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

    // We genereren het ID hier zelf, zodat we na het aanmaken niets hoeven
    // terug te vragen aan Supabase (dat teruggevraagd-in-dezelfde-aanvraag
    // patroon botst met de RLS-policy op deze tabel).
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
          <h1>Commitment aangemaakt</h1>
          <div className="card">
            <p>Stuur elke link zelf door naar de bijhorende persoon (via WhatsApp, mail, wat je wil):</p>
            {inviteLinks.map((i) => (
              <div className="field" key={i.link}>
                <label>{i.email}</label>
                <input type="text" readOnly value={i.link} onFocus={(e) => e.target.select()} />
              </div>
            ))}
            <p className="hint">
              Zodra iemand inlogt met dat e-mailadres en op zijn link klikt, wordt hij/zij je
              accountability-partner voor deze commitment. Een link verloopt na 7 dagen.
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
        <h1>Nieuwe commitment</h1>
        <p className="subtitle">Wees zo specifiek mogelijk — hoe concreter, hoe minder ruimte om te foezelen.</p>

        <form className="card" onSubmit={handleSubmit}>
          {error && <div className="error-box">{error}</div>}

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

          <div className="field">
            <label>Omschrijving (optioneel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Foto van mezelf rechtstaand in de keuken, binnen 5 minuten na het alarm."
            />
          </div>

          <div className="field">
            <label>Frequentie</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="daily">Elke dag</option>
              <option value="weekly">Bepaalde dagen van de week</option>
              <option value="once">Eenmalig</option>
            </select>
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

          <div className="field">
            <label>Deadline (jouw lokale tijd, Europe/Brussels)</label>
            <input
              type="time"
              required
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Hoe lever je bewijs?</label>
            <select value={proofType} onChange={(e) => setProofType(e.target.value)}>
              <option value="photo">Foto verplicht</option>
              <option value="checkbox">Simpel afvinken</option>
              <option value="both">Beide (foto of afvinken)</option>
            </select>
          </div>

          <div className="field">
            <label>Geldinzet bij missen (€)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={moneyStake}
              onChange={(e) => setMoneyStake(e.target.value)}
            />
            <div className="hint">
              Wordt bijgehouden als schuld aan je partner. De app int niets automatisch — jullie
              regelen de betaling zelf.
            </div>
          </div>

          <div className="field">
            <div className="checkbox-row">
              <input
                type="checkbox"
                id="social"
                checked={socialConsequence}
                onChange={(e) => setSocialConsequence(e.target.checked)}
              />
              <label htmlFor="social" style={{ marginBottom: 0 }}>
                Toon missers ook op het gedeelde overzicht ("wall of shame")
              </label>
            </div>
          </div>

          <div className="field">
            <label>Accountability-partner(s) uitnodigen (optioneel, kan later ook)</label>
            <textarea
              value={partnerEmails}
              onChange={(e) => setPartnerEmails(e.target.value)}
              placeholder={"naam@voorbeeld.com\nnog-iemand@voorbeeld.com"}
            />
            <div className="hint">
              Eén e-mailadres per lijn (of gescheiden door een komma). Meerdere partners
              verkleinen het risico dat er nooit iemand afkeurt.
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Bezig..." : "Commitment aanmaken"}
          </button>
        </form>
      </div>
    </>
  );
}
