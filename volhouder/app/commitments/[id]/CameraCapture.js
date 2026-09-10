"use client";

import { useEffect, useRef, useState } from "react";

// Een foto nemen die écht op dit moment gemaakt is, in plaats van een
// bestaand bestand uit de galerij te kunnen kiezen. Valt terug op een
// gewone bestandskiezer als de camera niet beschikbaar/toegestaan is —
// beter een zwakker bewijs dan de check-in onmogelijk maken.
export default function CameraCapture({ onCapture, capturedPreviewUrl, onRetake }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setFallback(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setActive(true);
      // De <video> bestaat pas na de state-update; koppel de stream in de volgende tick.
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 0);
    } catch (e) {
      setFallback(true);
      setError("Geen toegang tot de camera — je kan in plaats daarvan een foto kiezen.");
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
        stopStream();
        setActive(false);
      },
      "image/jpeg",
      0.85
    );
  }

  function handleFallbackFile(e) {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
  }

  if (capturedPreviewUrl) {
    return (
      <div>
        <img className="proof-photo" src={capturedPreviewUrl} alt="Genomen foto" />
        <button
          type="button"
          className="secondary"
          style={{ marginTop: 8 }}
          onClick={() => {
            onRetake();
            setFallback(false);
          }}
        >
          Opnieuw nemen
        </button>
      </div>
    );
  }

  if (fallback) {
    return (
      <div>
        {error && <div className="hint">{error}</div>}
        <input type="file" accept="image/*" capture="environment" onChange={handleFallbackFile} />
      </div>
    );
  }

  if (active) {
    return (
      <div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", borderRadius: 8, background: "#000" }}
        />
        <button type="button" style={{ marginTop: 8 }} onClick={takePhoto}>
          Maak foto
        </button>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={startCamera}>
        Camera openen
      </button>
      <div className="hint">
        Neemt de foto rechtstreeks op — je kan geen bestaande foto uit je
        galerij kiezen.
      </div>
    </div>
  );
}
