import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import WeekBoard from "./WeekBoard";
import { ChevronLeft, ChevronRight } from "lucide-react";

function mondayOf(date) {
  const d = new Date(date);
  const jsDay = d.getDay(); // 0=zo .. 6=za
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function WeekPage({ searchParams }) {
  const offset = parseInt(searchParams?.offset || "0", 10) || 0;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() + offset * 7);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().slice(0, 10));
  }
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const { data: commitments } = await supabase
    .from("commitments")
    .select("id, title")
    .eq("owner_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  const { data: entries } = await supabase
    .from("week_plan_entries")
    .select("commitment_id, planned_date")
    .eq("owner_id", user.id)
    .gte("planned_date", weekStart)
    .lte("planned_date", weekEnd);

  const titleById = {};
  for (const c of commitments || []) titleById[c.id] = c.title;

  const plannedIds = new Set((entries || []).map((e) => e.commitment_id));
  const initialPool = (commitments || [])
    .filter((c) => !plannedIds.has(c.id))
    .map((c) => ({ id: c.id, title: c.title }));
  const initialEntries = (entries || []).map((e) => ({
    commitment_id: e.commitment_id,
    planned_date: e.planned_date,
    title: titleById[e.commitment_id] || "Onbekende commitment",
  }));

  const rangeLabel = `${new Date(weekStart + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "short" })} – ${new Date(weekEnd + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "short" })}`;

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="dashboard-header">
          <div className="dashboard-greeting">Week</div>
          <div className="dashboard-date">{rangeLabel}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Link href={`/week?offset=${offset - 1}`} className="back-btn" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ChevronLeft size={16} strokeWidth={2} /> Vorige
          </Link>
          {offset !== 0 && (
            <Link href="/week" style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>
              Deze week
            </Link>
          )}
          <Link href={`/week?offset=${offset + 1}`} className="back-btn" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            Volgende <ChevronRight size={16} strokeWidth={2} />
          </Link>
        </div>

        {(!commitments || commitments.length === 0) ? (
          <div className="card">
            <div className="empty-state">
              <h3>Nog geen commitments</h3>
              <p>Maak eerst een commitment aan, dan kan je hem hier inplannen.</p>
              <Link href="/commitments/new" className="btn">Nieuwe commitment</Link>
            </div>
          </div>
        ) : (
          <WeekBoard
            userId={user.id}
            weekDates={weekDates}
            initialEntries={initialEntries}
            initialPool={initialPool}
          />
        )}
      </div>
    </>
  );
}
