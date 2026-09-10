"use client";

// Best-effort: een melding versturen mag de eigenlijke actie (indienen,
// afkeuren, ...) nooit blokkeren of laten mislukken.
export async function notifyEvent(event, commitmentId) {
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, commitmentId }),
    });
  } catch {
    // Stil negeren.
  }
}
