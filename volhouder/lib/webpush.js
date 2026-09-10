import webpush from "web-push";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:noreply@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

// Stuurt `payload` naar elk toestel dat een van deze profielen heeft
// geregistreerd. Best-effort: een individuele mislukking gooit de rest niet
// omver, en een verlopen registratie (410/404) ruimt zichzelf op.
export async function sendPushToProfiles(supabaseAdmin, profileIds, payload) {
  if (!profileIds || profileIds.length === 0) return;
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return; // Pushmeldingen zijn niet geconfigureerd — stil overslaan.
  }
  ensureConfigured();

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .in("profile_id", profileIds);

  await Promise.all(
    (subs || []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}
