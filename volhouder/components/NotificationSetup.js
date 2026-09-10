"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function NotificationSetup() {
  const supabase = createClient();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    setSupported(isSupported);

    if (isSupported) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setEnabled(!!sub))
        .catch(() => {});
    }
  }, []);

  async function enable() {
    setError(null);
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Meldingen werden geweigerd in de browser.");
        setLoading(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const json = subscription.toJSON();
      await supabase.from("push_subscriptions").upsert(
        {
          profile_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: "endpoint" }
      );

      setEnabled(true);
    } catch (e) {
      setError("Kon meldingen niet inschakelen: " + e.message);
    }
    setLoading(false);
  }

  if (!supported || enabled) return null;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <strong>Schakel pushmeldingen in</strong>
          <p className="hint" style={{ margin: "4px 0 0" }}>
            Krijg een melding als er iets te doen of te beoordelen is.
          </p>
        </div>
        <button type="button" onClick={enable} disabled={loading}>
          {loading ? "Bezig..." : "Inschakelen"}
        </button>
      </div>
      {error && <div className="error-box" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
