"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyEvent } from "@/lib/notify";
import CameraCapture from "./CameraCapture";
import { CheckCircle2, Clock } from "lucide-react";

export default function CheckinForm({ commitmentId, checkin, proofType, deadlineTime }) {
  const router = useRouter();
  const supabase = createClient();
  const [photoFile, setPhotoFile] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const needsPhoto = proofType === "photo" || proofType === "both";

  function handleCapture(file) {
    setPhotoFile(file || null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (needsPhoto && !photoFile) {
      setError("Maak eerst een foto als bewijs.");
      return;
    }
    setLoading(true);
    setError(null);

    let photoPath = null;
    if (photoFile) {
      const path = `${commitmentId}/${checkin.id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("proofs")
        .upload(path, photoFile, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) { setError(uploadError.message); setLoading(false); return; }
      photoPath = path;
    }

    const { error: ciError } = await supabase
      .from("check_ins")
      .update({
        status: "submitted",
        proof_note: note || null,
        photo_path: photoPath,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", checkin.id);

    setLoading(false);
    if (ciError) { setError(ciError.message); return; }

    notifyEvent("submitted", commitmentId);
    setSuccess(true);
    setTimeout(() => router.refresh(), 2000);
  }

  if (success) {
    return (
      <div className="card checkin-celebration">
        <div className="celebration-icon">
          <CheckCircle2 size={36} strokeWidth={1.75} />
        </div>
        <h2>Ingediend!</h2>
        <p className="celebration-streak">
          Je partner beoordeelt dit. Wordt automatisch goedgekeurd na 24 uur.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card checkin-hero-card">
        <div className="checkin-header">
          <span className="checkin-label">Bewijs van vandaag</span>
          {deadlineTime && (
            <span className="deadline-chip">
              <Clock size={12} strokeWidth={2} />
              vóór {deadlineTime}
            </span>
          )}
        </div>

        {error && <div className="error-box" style={{ margin: "0 20px 12px" }}>{error}</div>}

        {needsPhoto && (
          <div className="photo-section">
            <CameraCapture onCapture={handleCapture} />
          </div>
        )}

        <div className="note-section">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Voeg een notitie toe (optioneel)..."
            rows={2}
          />
        </div>

        <button
          type="submit"
          className="btn submit-checkin-btn"
          disabled={loading || (needsPhoto && !photoFile)}
        >
          {loading ? "Bezig..." : "Indienen"}
        </button>
      </div>
    </form>
  );
}
