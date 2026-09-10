import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

export default async function ReviewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.rpc("reconcile_my_checkins");

  const { data: myPartnerCommitments } = await supabase
    .from("commitment_partners")
    .select("commitment_id")
    .eq("profile_id", user.id);
  const commitmentIds = (myPartnerCommitments || []).map((r) => r.commitment_id);

  let pending = [];
  let disputed = [];
  if (commitmentIds.length > 0) {
    const { data } = await supabase
      .from("check_ins")
      .select("*, commitments!inner(id,title,owner:owner_id(display_name,email))")
      .in("commitment_id", commitmentIds)
      .eq("status", "submitted")
      .order("due_date", { ascending: true });
    pending = data || [];

    const { data: disputedData } = await supabase
      .from("check_ins")
      .select("*, commitments!inner(id,title,owner:owner_id(display_name,email))")
      .in("commitment_id", commitmentIds)
      .eq("status", "disputed")
      .order("due_date", { ascending: true });
    disputed = disputedData || [];
  }

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Te beoordelen</h1>
        <p className="subtitle">
          Ingediende bewijzen en betwistingen van commitments waar jij accountability-partner voor bent.
        </p>

        {disputed.length > 0 && (
          <div className="card">
            <h2>Betwistingen</h2>
            {disputed.map((ci) => (
              <Link key={ci.id} href={`/commitments/${ci.commitments.id}`} className="commitment-item">
                <div>
                  <div>{ci.commitments.title}</div>
                  <div className="meta">
                    {ci.due_date} · van {ci.commitments.owner?.display_name || ci.commitments.owner?.email}
                  </div>
                </div>
                <span className="badge disputed">beslecht</span>
              </Link>
            ))}
          </div>
        )}

        <div className="card">
          <h2>Ingediend bewijs</h2>
          {pending.length === 0 && (
            <div className="empty">Niets om te beoordelen op dit moment.</div>
          )}
          {pending.map((ci) => (
            <Link key={ci.id} href={`/commitments/${ci.commitments.id}`} className="commitment-item">
              <div>
                <div>{ci.commitments.title}</div>
                <div className="meta">
                  {ci.due_date} · van {ci.commitments.owner?.display_name || ci.commitments.owner?.email}
                </div>
              </div>
              <span className="badge submitted">bekijk</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
