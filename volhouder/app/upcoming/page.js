import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { isDueOnDate } from "@/lib/schedule";
import { inferIcon } from "@/lib/icons";
import { ChevronLeft, ChevronRight, Plus, Repeat, TrendingUp, CloudUpload, ArrowRight } from "lucide-react";
import { fetchICloudEvents } from "@/lib/icloud";
import CalendarBoard from "./CalendarBoard";

const HOUR_START = 6;
const HOUR_END = 24;
const HOUR_HEIGHT = 56; // px per uur
const BODY_HEIGHT = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

function mondayOf(date) {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
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

  const { data: rawCommitments } = await supabase
    .from("commitments")
    .select("id, title, frequency, days_of_week, once_date, deadline_time, proof_type, money_stake")
    .eq("active", true);

  const ids = (rawCommitments || []).map((c) => c.id);

  let partnerCounts = {};
  if (ids.length > 0) {
    const { data: partnerRows } = await supabase
      .from("commitment_partners")
      .select("commitment_id")
      .in("commitment_id", ids);
    for (const r of partnerRows || []) partnerCounts[r.commitment_id] = (partnerCounts[r.commitment_id] || 0) + 1;
  }

  // Een "simpele taak" (checkbox, geen inzet, geen partner) kan meteen en
  // zelfstandig afgevinkt worden — een echte commitment moet altijd via de
  // volle check-in flow (foto + evt. partnergoedkeuring).
  const commitments = (rawCommitments || []).map((c) => ({
    ...c,
    isSimple: c.proof_type === "checkbox" && Number(c.money_stake) === 0 && !partnerCounts[c.id],
  }));

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

  // iCloud-agenda (optioneel, alleen-lezen) — faalt nooit de pagina, enkel
  // een foutmelding op de koppeling zelf zodat de gebruiker die kan zien
  // op de Account-pagina.
  const { data: icloudAccount } = await supabase
    .from("icloud_accounts")
    .select("apple_id, app_password")
    .eq("owner_id", user.id)
    .maybeSingle();

  const icloudEventsByDay = {};
  for (const d of weekDates) icloudEventsByDay[d] = [];

  if (icloudAccount) {
    try {
      const events = await fetchICloudEvents(icloudAccount.apple_id, icloudAccount.app_password, weekDates[0], weekDates[6]);
      for (const ev of events) {
        if (icloudEventsByDay[ev.date]) icloudEventsByDay[ev.date].push(ev);
      }
      await supabase.from("icloud_accounts").update({ last_error: null }).eq("owner_id", user.id);
    } catch (err) {
      await supabase
        .from("icloud_accounts")
        .update({ last_error: String(err?.message || err).slice(0, 300) })
        .eq("owner_id", user.id);
    }
  }

  const rangeLabel = `${new Date(weekDates[0] + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "short" })} – ${new Date(weekDates[6] + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "short" })}`;

  // Simpele herhalende gewoontes leven bovenaan in de "gewoontes"-pool
  // (versleepbaar naar een tijdslot); alles met een geldinzet/partner of
  // een eenmalig tijdstip krijgt een vast blok in het uren-rooster.
  const itemsByDay = {};
  const poolByDay = {};
  for (const d of weekDates) {
    const due = commitments
      .filter((c) => isDueOnDate(c, d))
      .map((c) => ({ commitment: c, status: statusByKey[`${c.id}_${d}`] }));

    poolByDay[d] = due.filter(({ commitment: c }) => c.isSimple && c.frequency !== "once");
    itemsByDay[d] = due
      .filter(({ commitment: c }) => !(c.isSimple && c.frequency !== "once"))
      .sort((a, b) => (a.commitment.deadline_time || "").localeCompare(b.commitment.deadline_time || ""));
  }
  const totalDue = Object.values(itemsByDay).reduce((sum, arr) => sum + arr.length, 0)
    + Object.values(poolByDay).reduce((sum, arr) => sum + arr.length, 0);

  const decided = checkIns.filter((c) => ["approved", "missed", "rejected"].includes(c.status));
  const approvedCount = decided.filter((c) => c.status === "approved").length;
  const weekRate = decided.length > 0 ? Math.round((approvedCount / decided.length) * 100) : null;
  const habitCount = (commitments || []).filter((c) => c.frequency !== "once").length;
  const taskCount = (commitments || []).filter((c) => c.frequency === "once").length;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upNext = weekDates
    .flatMap((d) => [...itemsByDay[d], ...poolByDay[d]].map((item) => ({ ...item, date: d })))
    .filter(({ date, commitment }) => {
      if (date > today) return true;
      if (date < today) return false;
      const [hh, mm] = (commitment.deadline_time || "00:00").split(":").map(Number);
      return hh * 60 + mm >= nowMinutes;
    })
    .sort((a, b) => (a.date + a.commitment.deadline_time).localeCompare(b.date + b.commitment.deadline_time))
    .slice(0, 6);

  const UP_NEXT_DAY_LABEL = { [today]: "Vandaag" };

  return (
    <>
      <Nav />
      <div className="shell shell-wide">
        <div className="dashboard-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div className="dashboard-greeting" style={{ fontSize: 22 }}>Aankomend</div>
            <div className="dashboard-date">{rangeLabel}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <Link href={`/upcoming?week=${offset - 1}`} className="cal-nav-btn"><ChevronLeft size={16} strokeWidth={2} /></Link>
            {offset !== 0 && <Link href="/upcoming" className="cal-nav-btn cal-nav-today">Nu</Link>}
            <Link href={`/upcoming?week=${offset + 1}`} className="cal-nav-btn"><ChevronRight size={16} strokeWidth={2} /></Link>
          </div>
        </div>

        {totalDue === 0 && (
          <div className="empty-hint" style={{ marginBottom: 16 }}>
            <Repeat size={14} strokeWidth={2} />
            Niets gepland deze week.
          </div>
        )}

        <div className="cal-layout">
        <CalendarBoard
          userId={user.id}
          weekDates={weekDates}
          today={today}
          nowTop={nowTop}
          showNowLine={showNowLine}
          poolByDay={poolByDay}
          itemsByDay={itemsByDay}
          icloudEventsByDay={icloudEventsByDay}
        />

        <div className="cal-sidebar">
          <div className="cal-stat-card">
            <div className="cal-stat-header">
              <TrendingUp size={14} strokeWidth={2} color="var(--navy)" />
              <span>Deze week</span>
            </div>
            <div className="cal-stat-rate">{weekRate === null ? "—" : `${weekRate}%`}</div>
            <div className="streak-bar" style={{ marginBottom: 10 }}>
              <div className="streak-bar-fill" style={{ width: `${weekRate ?? 0}%` }} />
            </div>
            <div className="cal-stat-row">
              <span>{habitCount} {habitCount === 1 ? "gewoonte" : "gewoontes"}</span>
              <span>{taskCount} {taskCount === 1 ? "taak" : "taken"}</span>
            </div>
          </div>

          <div className="cal-stat-card">
            <div className="cal-stat-header">
              <ChevronRight size={14} strokeWidth={2} color="var(--navy)" />
              <span>Wat volgt</span>
            </div>
            {upNext.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Niets meer gepland deze week.</p>
            )}
            {upNext.map(({ commitment, date }, i) => {
              const Icon = inferIcon(commitment.title);
              const dayLabel = UP_NEXT_DAY_LABEL[date] || new Date(date + "T12:00:00").toLocaleDateString("nl-BE", { weekday: "short" });
              return (
                <Link key={`${commitment.id}_${date}`} href={`/commitments/${commitment.id}`} className="cal-upnext-row">
                  <span className="cal-upnext-icon"><Icon size={13} strokeWidth={1.75} /></span>
                  <span className="cal-upnext-info">
                    <span className="cal-upnext-title">{commitment.title}</span>
                    <span className="cal-upnext-meta">{dayLabel} · {commitment.deadline_time?.slice(0, 5)}</span>
                  </span>
                </Link>
              );
            })}
          </div>

          <Link href="/account" className="cal-stat-card cal-icloud-card">
            <div className="cal-stat-header">
              <CloudUpload size={14} strokeWidth={2} color="var(--navy)" />
              <span>iCloud-agenda</span>
            </div>
            {icloudAccount ? (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px" }}>
                Gekoppeld met {icloudAccount.apple_id}
              </p>
            ) : (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px" }}>
                Koppel je Apple-agenda zodat bestaande afspraken hier ook verschijnen.
              </p>
            )}
            <span className="cal-upnext-meta" style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--navy-light)", fontWeight: 700 }}>
              {icloudAccount ? "Beheren" : "Instellen"} <ArrowRight size={12} strokeWidth={2} />
            </span>
          </Link>
        </div>
        </div>
      </div>

      <Link href="/commitments/quick" className="fab wide" title="Snel plannen">
        <Plus size={22} strokeWidth={2} />
      </Link>
    </>
  );
}
