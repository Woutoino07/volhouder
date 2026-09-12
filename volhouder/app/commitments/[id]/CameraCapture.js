"use client";
import { useRef, useState } from "react";
import { Camera, RotateCcw, Upload, X } from "lucide-react";

export default function CameraCapture({ onCapture, required }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [mode, setMode] = useState("idle"); // idle | opening | live | preview | fallback
  const [photoDataUrl, setPhotoDataUrl] = useState(null);

  async function openCamera() {
    setMode("opening");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      setMode("live");
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 50);
    } catch {
      setMode("fallback");
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function takePhoto() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    canvas.toBlob((blob) => {
      const file = new File([blob], `proof-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
    }, "image/jpeg", 0.85);
    setPhotoDataUrl(dataUrl);
    setMode("preview");
    stopStream();
  }

  function retake() {
    setPhotoDataUrl(null);
    onCapture(null);
    setMode("idle");
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoDataUrl(url);
    onCapture(file);
    setMode("preview");
  }

  if (mode === "preview" && photoDataUrl) {
    return (
      <div className="capture-preview">
        <img src={photoDataUrl} alt="Bewijsfoto" />
        <button type="button" className="retake-btn" onClick={retake}>
          <RotateCcw size={13} strokeWidth={2} /> Opnieuw
        </button>
        <div className="capture-preview-ok">Foto toegevoegd</div>
      </div>
    );
  }

  if (mode === "live" || mode === "opening") {
    return (
      <div className="camera-live">
        <div className="camera-viewport">
          <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
          {mode === "opening" && (
            <div className="camera-loading">
              <Camera size={28} strokeWidth={1.5} />
              <span>Camera openen...</span>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <button type="button" className="camera-close" onClick={() => { stopStream(); setMode("idle"); }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <button type="button" className="shutter-btn" onClick={takePhoto} disabled={mode !== "live"}>
          <span className="shutter-inner" />
        </button>
      </div>
    );
  }

  if (mode === "fallback") {
    return (
      <label className="capture-trigger fallback">
        <input type="file" accept="image/*" capture="environment" onChange={handleFileInput} style={{ display: "none" }} />
        <Upload size={28} strokeWidth={1.5} />
        <span>Foto uploaden</span>
        <small>Tik om een foto te kiezen</small>
      </label>
    );
  }

  return (
    <div className="capture-trigger-wrap">
      <button type="button" className="capture-trigger" onClick={openCamera}>
        <Camera size={36} strokeWidth={1.5} />
        <span>Maak bewijsfoto</span>
        <small>{required ? "Verplicht voor dit commitment" : "Optioneel — voeg bewijs toe"}</small>
      </button>
      <div className="capture-or">
        <span>of</span>
      </div>
      <label className="capture-upload-alt">
        <input type="file" accept="image/*" onChange={handleFileInput} style={{ display: "none" }} />
        <Upload size={14} strokeWidth={2} /> Kies uit bibliotheek
      </label>
    </div>
  );
}
