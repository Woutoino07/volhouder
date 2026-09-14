import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { Flag, Plus, ChevronRight } from "lucide-react";

export default async function GoalsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: goals, error } = await supabase
    .from("goals")
    .select("*, commitments(id)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const { data: unassigned } = await supabase
    .from("commitments")
    .select("id, title, active")
    .eq("owner_id", user.id)
    .is("goal_id", null)
    .eq("active", true);

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="dashboard-header">
          <div className="dashboard-greeting">Doelen</div>
          <div className="dashboard-date">Groepeer commitments onder een doel</div>
        </div>

        {error && <div className="error-box">{error.message}</div>}

        {(!goals || goals.length === 0) && (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Flag size={24} strokeWidth={1.75} />
              </div>
              <h3>Nog geen doelen</h3>
              <p>Een doel bundelt één of meerdere commitments, zodat je in één oogopslag ziet waar ze voor dienen.</p>
              <Link href="/goals/new" className="btn">Eerste doel aanmaken</Link>
            </div>
          </div>
        )}

        {goals && goals.length > 0 && (
          <>
            <div className="section-header">
              <span className="section-title">Jouw doelen</span>
              <span className="section-pill">{goals.length}</span>
            </div>

            {goals.map((goal) => (
              <Link key={goal.id} href={`/goals/${goal.id}`} className="today-card">
                <div className="today-card-accent pending" />
                <div className="today-card-body">
                  <div className="today-card-title">{goal.title}</div>
                  <div className="today-card-meta">
                    <span>
                      {goal.commitments?.length || 0}{" "}
                      {goal.commitments?.length === 1 ? "commitment" : "commitments"}
                    </span>
                    {goal.target_date && (
                      <>
                        <span>·</span>
                        <span>
                          tegen {new Date(goal.target_date + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "short" })}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="today-card-footer">
                    <span />
                    <span className="checkin-cta">
                      Bekijk
                      <ChevronRight size={14} strokeWidth={2} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </>
        )}

        {unassigned && unassigned.length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 28 }}>
              <span className="section-title" style={{ fontSize: 15, color: "var(--muted)" }}>
                Nog geen doel
              </span>
            </div>
            <div className="not-today-list">
              {unassigned.map((c) => (
                <Link key={c.id} href={`/commitments/${c.id}`} className="not-today-item">
                  <span style={{ fontWeight: 500 }}>{c.title}</span>
                  <span className="not-today-next">→</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <Link href="/goals/new" className="fab" title="Nieuw doel">
        <Plus size={22} strokeWidth={2} />
      </Link>
    </>
  );
}
