"use client";
import { useRef, useState, useEffect } from "react";
import { Camera, RotateCcw, Upload } from "lucide-react";

export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [mode, setMode] = useState("init"); // init | live | preview | fallback
  const [photoDataUrl, setPhotoDataUrl] = useState(null);

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, []);

  async function startCamera() {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setMode("live");
    } catch {
      setMode("fallback");
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function takePhoto() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    canvas.toBlob(blob => {
      const file = new File([blob], `proof-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file, dataUrl);
    }, "image/jpeg", 0.85);
    setPhotoDataUrl(dataUrl);
    setMode("preview");
    stopStream();
  }

  function retake() {
    setPhotoDataUrl(null);
    onCapture(null, null);
    setMode("init");
    startCamera();
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoDataUrl(url);
    onCapture(file, url);
    setMode("preview");
  }

  if (mode === "preview" && photoDataUrl) {
    return (
      <div className="photo-preview-hero">
        <img src={photoDataUrl} alt="Bewijsfoto" />
        <button type="button" className="retake-btn" onClick={retake}>
          <RotateCcw size={13} strokeWidth={2} /> Opnieuw
        </button>
      </div>
    );
  }

  if (mode === "fallback") {
    return (
      <label className="camera-hero-fallback">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInput}
          style={{ display: "none" }}
        />
        <Upload size={32} strokeWidth={1.5} />
        <span>Klik om foto te uploaden</span>
        <small>Of sleep een afbeelding hierheen</small>
      </label>
    );
  }

  return (
    <div className="camera-hero">
      <div className="camera-viewport">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={mode === "live" ? "camera-video visible" : "camera-video"}
        />
        {mode === "init" && (
          <div className="camera-loading">
            <Camera size={32} strokeWidth={1.5} />
            <span>Camera openen...</span>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
      <button
        type="button"
        className="shutter-btn"
        onClick={takePhoto}
        disabled={mode !== "live"}
      >
        <span className="shutter-inner" />
      </button>
    </div>
  );
}
