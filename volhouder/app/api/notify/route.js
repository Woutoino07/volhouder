import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToProfiles } from "@/lib/webpush";

const MESSAGES = {
  submitted: { title: "Bewijs ingediend", body: (t) => `Er staat bewijs klaar voor "${t}".`, url: "/review" },
  rejected: { title: "Afgekeurd", body: (t) => `Je bewijs voor "${t}" is afgekeurd.`, url: "/" },
  disputed: { title: "Betwisting", body: (t) => `Er is een betwisting voor "${t}" die jouw beslissing vraagt.`, url: "/review" },
  resolved: { title: "Betwisting beslecht", body: (t) => `De betwisting voor "${t}" is beslecht.`, url: "/" },
};

// Wordt aangeroepen door de app zelf net na een actie (indienen, afkeuren,
// betwisten, beslechten). Gebruikt de sessie van de aanroeper: RLS bepaalt
// of die de commitment überhaupt mag zien, dus iemand kan geen meldingen
// laten versturen voor een commitment waar hij part noch deel van heeft.
export async function POST(request) {
  const { event, commitmentId } = await request.json();
  const msg = MESSAGES[event];
  if (!msg || !commitmentId) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: commitment } = await supabase
    .from("commitments")
    .select("id, title, owner_id")
    .eq("id", commitmentId)
    .single();
  if (!commitment) {
    // RLS liet niets terugkomen: geen lid, dus ook geen melding versturen.
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  let recipients = [];
  if (event === "submitted" || event === "disputed") {
    const { data: partners } = await admin
      .from("commitment_partners")
      .select("profile_id")
      .eq("commitment_id", commitmentId);
    recipients = (partners || []).map((p) => p.profile_id);
  } else {
    recipients = [commitment.owner_id];
  }
  recipients = recipients.filter((id) => id !== user.id);

  await sendPushToProfiles(admin, recipients, {
    title: msg.title,
    body: msg.body(commitment.title),
    url: msg.url,
  });

  return NextResponse.json({ ok: true });
}
