import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import GoalCommitmentLinker from "./GoalCommitmentLinker";
import DeleteGoalButton from "./DeleteGoalButton";

export default async function GoalDetailPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: goal } = await supabase
    .from("goals")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!goal) notFound();

  const { data: linked } = await supabase
    .from("commitments")
    .select("id, title")
    .eq("goal_id", goal.id)
    .order("created_at", { ascending: false });

  const { data: unassigned } = await supabase
    .from("commitments")
    .select("id, title")
    .eq("owner_id", user.id)
    .is("goal_id", null)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="detail-header">
          <Link href="/goals" className="back-btn">←</Link>
          <h1>{goal.title}</h1>
        </div>

        {goal.description && (
          <p className="subtitle">{goal.description}</p>
        )}

        {goal.target_date && (
          <div style={{ fontSize: 13, color: "var(--muted)", margin: "-10px 0 16px" }}>
            Streefdatum: {new Date(goal.target_date + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}

        <div className="section-header">
          <span className="section-title">Commitments</span>
          <Link href={`/commitments/new?goal_id=${goal.id}&goal_title=${encodeURIComponent(goal.title)}`} className="section-subtitle">
            + Nieuwe taak
          </Link>
        </div>

        <GoalCommitmentLinker
          goalId={goal.id}
          linked={linked || []}
          unassigned={unassigned || []}
        />

        <div style={{ marginTop: 20, marginBottom: 24 }}>
          <DeleteGoalButton goalId={goal.id} />
        </div>
      </div>
    </>
  );
}
