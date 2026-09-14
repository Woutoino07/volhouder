import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { isDueOnDate } from "@/lib/schedule";
import { inferIcon } from "@/lib/icons";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const DAY_LABELS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const HOUR_START = 6;
const HOUR_END = 22;
const HOUR_HEIGHT = 48; // px per uur
const BODY_HEIGHT = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

function mondayOf(date) {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function accentOf(status) {
  if (status === "approved") return "approved";
  if (status === "submitted") return "submitted";
  if (status === "missed" || status === "rejected") return "missed";
  return "pending";
}

function ChipIcon({ title }) {
  const Icon = inferIcon(title);
  return <Icon size={10} strokeWidth={2.25} style={{ flexShrink: 0 }} />;
}

export default async function UpcomingPage({ searchParams }) {
  const offset = parseInt(searchParams?.week || "0", 10) || 0;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() + offset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nowTop = (now.getHours() - HOUR_START + now.getMinutes() / 60) * HOUR_HEIGHT;
  const showNowLine = nowTop >= 0 && nowTop <= BODY_HEIGHT;

  const { data: commitments } = await supabase
    .from("commitments")
    .select("id, title, frequency, days_of_week, once_date, deadline_time")
    .eq("active", true);

  const ids = (commitments || []).map((c) => c.id);
  let checkIns = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("check_ins")
      .select("commitment_id, due_date, status")
      .in("commitment_id", ids)
      .gte("due_date", weekDates[0])
      .lte("due_date", weekDates[6]);
    checkIns = data || [];
  }
  const statusByKey = {};
  for (const c of checkIns) statusByKey[`${c.commitment_id}_${c.due_date}`] = c.status;

  const habits = (commitments || []).filter((c) => c.frequency !== "once");
  const tasks = (commitments || []).filter((c) => c.frequency === "once");

  const rangeLabel = `${new Date(weekDates[0] + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "short" })} – ${new Date(weekDates[6] + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "short" })}`;

  return (
    <>
      <Nav />
      <div className="shell" style={{ maxWidth: 900 }}>
        <div className="dashboard-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div className="dashboard-greeting" style={{ fontSize: 22 }}>Aankomend</div>
            <div className="dashboard-date">{rangeLabel}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <Link href={`/upcoming?week=${offset - 1}`} className="cal-nav-btn"><ChevronLeft size={16} strokeWidth={2} /></Link>
            {offset !== 0 && <Link href="/upcoming" className="cal-nav-btn" style={{ width: "auto", padding: "0 10px", fontSize: 11, fontWeight: 700 }}>Nu</Link>}
            <Link href={`/upcoming?week=${offset + 1}`} className="cal-nav-btn"><ChevronRight size={16} strokeWidth={2} /></Link>
          </div>
        </div>

        <div className="cal-wrap">
          <div className="cal-grid">
            {/* Header row */}
            <div className="cal-corner" />
            {weekDates.map((d, i) => {
              const dayNum = Number(d.slice(8, 10));
              const isToday = d === today;
              return (
                <div key={d} className={`cal-header-cell ${isToday ? "today-col" : ""}`}>
                  <span className="cal-day-label">{DAY_LABELS[i]}</span>
                  <span className={`cal-day-num ${isToday ? "today" : ""}`}>{dayNum}</span>
                  <Link href={`/commitments/new?date=${d}`} className="cal-add-btn" title="Toevoegen op deze dag">
                    <Plus size={11} strokeWidth={2.5} />
                  </Link>
                </div>
              );
            })}

            {/* All-day / gewoontes row */}
            <div className="cal-allday-label">Gewoontes</div>
            {weekDates.map((d) => {
              const dueHabits = habits.filter((h) => isDueOnDate(h, d));
              const isToday = d === today;
              return (
                <div key={d} className={`cal-allday-cell ${isToday ? "today-col" : ""}`}>
                  {dueHabits.map((h) => {
                    const status = statusByKey[`${h.id}_${d}`];
                    return (
                      <Link key={h.id} href={`/commitments/${h.id}`} className={`cal-chip ${accentOf(status)}`}>
                        <ChipIcon title={h.title} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{h.title}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}

            {/* Time axis */}
            <div className="cal-time-axis" style={{ height: BODY_HEIGHT }}>
              {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i).map((h) => (
                <span key={h} className="cal-time-label" style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}>
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>

            {/* Day bodies */}
            {weekDates.map((d) => {
              const dueTasks = tasks.filter((t) => t.once_date === d);
              const isToday = d === today;
              return (
                <div
                  key={d}
                  className={`cal-day-body ${isToday ? "today-col" : ""}`}
                  style={{
                    height: BODY_HEIGHT,
                    backgroundSize: `100% ${HOUR_HEIGHT}px`,
                  }}
                >
                  {isToday && showNowLine && (
                    <div className="cal-now-line" style={{ top: nowTop }}>
                      <span className="cal-now-dot" />
                    </div>
                  )}
                  {dueTasks.map((t) => {
                    const [hh, mm] = (t.deadline_time || "08:00").split(":").map(Number);
                    const clampedHour = Math.min(Math.max(hh, HOUR_START), HOUR_END - 1);
                    const top = (clampedHour - HOUR_START) * HOUR_HEIGHT + (mm / 60) * HOUR_HEIGHT;
                    const status = statusByKey[`${t.id}_${d}`];
                    const Icon = inferIcon(t.title);
                    return (
                      <Link
                        key={t.id}
                        href={`/commitments/${t.id}`}
                        className={`cal-task-block ${accentOf(status)}`}
                        style={{ top }}
                      >
                        <span className="cal-task-time">
                          <Icon size={9} strokeWidth={2.25} /> {t.deadline_time?.slice(0, 5)}
                        </span>
                        <span className="cal-task-title">{t.title}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Link href="/commitments/new" className="fab" title="Nieuwe commitment">
        <Plus size={22} strokeWidth={2} />
      </Link>
    </>
  );
}
