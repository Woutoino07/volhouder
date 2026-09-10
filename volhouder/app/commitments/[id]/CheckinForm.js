"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyEvent } from "@/lib/notify";
import CameraCapture from "./CameraCapture";

export default function CheckinForm({ commitmentId, checkin, proofType }) {
  const router = useRouter();
  const supabase = createClient();
  const [note, setNote] = useState("");
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const needsPhoto = proofType === "photo";
  const showPhoto = proofType === "photo" || proofType === "both";
  const showCheckbox = proofType === "checkbox" || proofType === "both";
  const needsCheckbox = proofType === "checkbox";

  function handleCapture(blob) {
    setPhotoBlob(blob);
    setPhotoPreviewUrl(URL.createObjectURL(blob));
  }

  function handleRetake() {
    setPhotoBlob(null);
    setPhotoPreviewUrl(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (needsPhoto && !photoBlob) {
      setError("Deze commitment vereist een foto.");
      return;
    }
    if (needsCheckbox && !confirmed) {
      setError("Bevestig met het vinkje dat je dit gedaan hebt.");
      return;
    }
    if (proofType === "both" && !photoBlob && !confirmed) {
      setError("Lever een foto, of bevestig met het vinkje.");
      return;
    }

    setLoading(true);

    let photoPath = null;
    if (photoBlob) {
      photoPath = `${commitmentId}/${checkin.id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("proofs")
        .upload(photoPath, photoBlob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("check_ins")
      .update({
        status: "submitted",
        proof_note: note || null,
        photo_path: photoPath,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", checkin.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    notifyEvent("submitted", commitmentId);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>Bewijs indienen voor vandaag</h2>
      {error && <div className="error-box">{error}</div>}

      {showPhoto && (
        <div className="field">
          <label>Foto</label>
          <CameraCapture
            onCapture={handleCapture}
            capturedPreviewUrl={photoPreviewUrl}
            onRetake={handleRetake}
          />
        </div>
      )}

      {showCheckbox && (
        <div className="field">
          <div className="checkbox-row">
            <input
              type="checkbox"
              id="confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <label htmlFor="confirm" style={{ marginBottom: 0 }}>
              Ik bevestig dat ik dit gedaan heb
            </label>
          </div>
        </div>
      )}

      <div className="field">
        <label>Notitie (optioneel)</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Bezig..." : "Indienen"}
      </button>
    </form>
  );
}
