import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToProfiles } from "@/lib/webpush";

// Draait één keer per dag (zie vercel.json) — het gratis Vercel-plan staat
// geen vaker draaiende cron toe. Dit is dus een dagelijkse herinnering,
// geen minuut-precieze deadline-melding.
//
// Doet twee dingen die anders pas gebeuren zodra iemand toevallig de app
// opent: (1) verlopen check-ins global afhandelen (missed/approved + straf),
// zodat niemand een week kan wegblijven om een miss te ontlopen, en
// (2) mensen die iets te doen of te beoordelen hebben een pushmelding sturen.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  await supabase.rpc("generate_todays_checkins");
  await supabase.rpc("reconcile_all_checkins");

  const today = new Date().toISOString().slice(0, 10);

  // Herinnering voor eigenaars met iets te doen vandaag.
  const { data: pending } = await supabase
    .from("check_ins")
    .select("commitment_id, commitments(owner_id, title)")
    .eq("status", "pending")
    .eq("due_date", today);

  const ownerTitles = new Map();
  for (const row of pending || []) {
    const ownerId = row.commitments?.owner_id;
    const title = row.commitments?.title;
    if (!ownerId) continue;
    if (!ownerTitles.has(ownerId)) ownerTitles.set(ownerId, []);
    ownerTitles.get(ownerId).push(title);
  }
  await Promise.all(
    Array.from(ownerTitles.entries()).map(([ownerId, titles]) =>
      sendPushToProfiles(supabase, [ownerId], {
        title: "Nog te doen vandaag",
        body: titles.join(", "),
        url: "/",
      })
    )
  );

  // Herinnering voor partners met iets te beoordelen of te beslechten.
  const { data: toHandle } = await supabase
    .from("check_ins")
    .select("commitment_id")
    .in("status", ["submitted", "disputed"]);

  const commitmentIds = [...new Set((toHandle || []).map((r) => r.commitment_id))];
  if (commitmentIds.length > 0) {
    const { data: partnerRows } = await supabase
      .from("commitment_partners")
      .select("commitment_id, profile_id")
      .in("commitment_id", commitmentIds);

    const counts = new Map();
    for (const row of partnerRows || []) {
      counts.set(row.profile_id, (counts.get(row.profile_id) || 0) + 1);
    }
    await Promise.all(
      Array.from(counts.entries()).map(([profileId, count]) =>
        sendPushToProfiles(supabase, [profileId], {
          title: "Er staat iets te beoordelen",
          body: `${count} item${count > 1 ? "s" : ""} wachten op jou in Volhouder.`,
          url: "/review",
        })
      )
    );
  }

  return NextResponse.json({ ok: true });
}
