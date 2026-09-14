"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function roundedTimeInOneHour() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const mins = d.getMinutes() < 30 ? "00" : "30";
  return `${String(d.getHours()).padStart(2, "0")}:${mins}`;
}

export default function QuickTaskPage() {
  return (
    <Suspense fallback={null}>
      <QuickTaskForm />
    </Suspense>
  );
}

function QuickTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(searchParams.get("date") || todayStr());
  const [time, setTime] = useState(searchParams.get("time") || roundedTimeInOneHour());
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("commitments").insert({
      id: crypto.randomUUID(),
      owner_id: user.id,
      title,
      frequency: "once",
      once_date: date,
      deadline_time: time,
      proof_type: "checkbox",
      money_stake: 0,
      social_consequence: false,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    showToast(`"${title}" toegevoegd aan je kalender`);
    router.push("/upcoming");
    router.refresh();
  }

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="detail-header">
          <Link href="/upcoming" className="back-btn">←</Link>
          <h1>Snel plannen</h1>
        </div>
        <p className="subtitle">Gewoon een taak of afspraak — geen bewijs, geen inzet, geen partner nodig.</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-box">{error}</div>}

          <div className="card">
            <div className="field">
              <label>Wat sta je te doen?</label>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tandarts, boodschappen, call met..."
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Datum</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Tijd</label>
                <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-full" style={{ width: "100%", padding: "14px", fontSize: 15, borderRadius: "var(--radius-pill)", marginBottom: 16 }}>
            {loading ? "Bezig..." : "Toevoegen aan kalender"}
          </button>

          <Link
            href={`/commitments/new?date=${date}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px", fontSize: 13, fontWeight: 600, color: "var(--muted)",
              textDecoration: "none", marginBottom: 24,
            }}
          >
            Liever met geldinzet & partnergoedkeuring? <ArrowRight size={13} strokeWidth={2} />
          </Link>
        </form>
      </div>
    </>
  );
}
