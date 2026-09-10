import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL = {
  rejected: "afgekeurd door partner",
  missed: "gemist",
};

export default async function WallPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myPartnerCommitments } = await supabase
    .from("commitment_partners")
    .select("commitment_id")
    .eq("profile_id", user.id);

  // RLS beperkt "commitments" toch al tot wat ik mag zien; hier vragen we
  // enkel de commitments op waar ikzelf eigenaar of partner van ben.
  const { data: myOwnCommitments } = await supabase
    .from("commitments")
    .select("id")
    .eq("owner_id", user.id);

  const commitmentIds = [
    ...new Set([
      ...(myPartnerCommitments || []).map((r) => r.commitment_id),
      ...(myOwnCommitments || []).map((r) => r.id),
    ]),
  ];

  let misses = [];
  if (commitmentIds.length > 0) {
    const { data } = await supabase
      .from("check_ins")
      .select("*, commitments!inner(title,social_consequence,owner:owner_id(display_name,email))")
      .in("commitment_id", commitmentIds)
      .in("status", ["missed", "rejected"])
      .eq("commitments.social_consequence", true)
      .order("due_date", { ascending: false })
      .limit(50);
    misses = data || [];
  }

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Overzicht missers</h1>
        <p className="subtitle">
          Alle gemiste of afgekeurde check-ins van commitments die je met iemand deelt.
        </p>

        <div className="card">
          {misses.length === 0 && <div className="empty">Geen missers — hou zo vol.</div>}
          {misses.map((m) => (
            <div key={m.id} style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div>{m.commitments.title}</div>
                  <div className="meta">
                    {m.due_date} · {m.commitments.owner?.display_name || m.commitments.owner?.email}
                  </div>
                </div>
                <span className={`badge ${m.status}`}>{STATUS_LABEL[m.status]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
