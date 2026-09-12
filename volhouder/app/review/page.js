import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { CheckSquare, ChevronRight } from "lucide-react";

function relativeDate(dateStr) {
  if (!dateStr) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Gisteren";
  return d.toLocaleDateString("nl-BE", { day: "numeric", month: "short" });
}

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
        <div className="page-header">
          <h1>Beoordelen</h1>
          <p className="subtitle" style={{ margin: 0 }}>Ingediende bewijzen van jouw partners.</p>
        </div>

        {disputed.length > 0 && (
          <div className="card-section">
            <div className="card-section-header">
              <h2>Betwistingen</h2>
            </div>
            {disputed.map((ci) => (
              <Link key={ci.id} href={`/commitments/${ci.commitments.id}`} className="list-item">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ci.commitments.title}</div>
                  <div className="meta">
                    {relativeDate(ci.due_date)} · {ci.commitments.owner?.display_name || ci.commitments.owner?.email}
                  </div>
                </div>
                <span className="badge disputed">beslechten</span>
              </Link>
            ))}
          </div>
        )}

        <div className="card-section">
          <div className="card-section-header">
            <h2>Ingediend bewijs</h2>
          </div>
          {pending.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><CheckSquare size={24} strokeWidth={1.75} /></div>
              <h3>Alles bijgewerkt</h3>
              <p>Er is niets om te beoordelen op dit moment. Je partners stellen je op de hoogte wanneer ze een check-in indienen.</p>
            </div>
          )}
          {pending.map((ci) => (
            <Link key={ci.id} href={`/commitments/${ci.commitments.id}`} className="list-item">
              <div style={{ flex: 1, marginRight: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{ci.commitments.title}</div>
                <div className="meta">
                  {relativeDate(ci.due_date)} · {ci.commitments.owner?.display_name || ci.commitments.owner?.email}
                </div>
                {ci.proof_note && (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, fontStyle: "italic" }}>
                    "{ci.proof_note}"
                  </div>
                )}
              </div>
              <span className="badge submitted" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>bekijk <ChevronRight size={12} strokeWidth={1.75} /></span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
