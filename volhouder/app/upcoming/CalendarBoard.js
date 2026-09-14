"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import { inferIcon } from "@/lib/icons";
import { Plus, Cloud, Check } from "lucide-react";

const DAY_LABELS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const HOUR_START = 6;
const HOUR_END = 24;
const HOUR_HEIGHT = 56; // px per uur
const SLOT_MIN = 30; // sleep-precisie in minuten
const BODY_HEIGHT = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

function accentOf(status) {
  if (status === "approved") return "approved";
  if (status === "submitted") return "submitted";
  if (status === "missed" || status === "rejected") return "missed";
  return "pending";
}

function timeToTop(time) {
  const [hh, mm] = (time || "08:00").split(":").map(Number);
  const clampedHour = Math.min(Math.max(hh, HOUR_START), HOUR_END - 1);
  return (clampedHour - HOUR_START) * HOUR_HEIGHT + (mm / 60) * HOUR_HEIGHT;
}

// ── Versleepbare gewoonte-chip (bovenaan de dag) ───
function HabitChip({ commitment, status, date, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `habit::${commitment.id}::${date}`,
  });
  const Icon = inferIcon(commitment.title);
  const done = status === "approved";
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} className={`cal-chip ${done ? "done" : ""}`} {...attributes}>
      <span {...listeners} className="cal-chip-drag"><Icon size={10} strokeWidth={2.25} /></span>
      <span className="cal-chip-title">{commitment.title}</span>
      <button type="button" className="cal-chip-check" onClick={() => onToggle(commitment, date, status)}>
        {done ? <Check size={10} strokeWidth={3} /> : null}
      </button>
    </div>
  );
}

// ── Droppable half-uur-vak (onzichtbaar, achter de blokken) ───
function DropSlot({ id, top }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="cal-drop-slot"
      style={{ top, height: HOUR_HEIGHT / 2, background: isOver ? "rgba(37,99,235,0.08)" : "transparent" }}
    />
  );
}

// ── Positioned taak/commitment-blok ────────────────
function TaskBlock({ commitment, status, onToggle }) {
  const top = timeToTop(commitment.deadline_time);
  const Icon = inferIcon(commitment.title);
  const done = status === "approved";

  if (commitment.isSimple) {
    return (
      <button
        type="button"
        onClick={() => onToggle(commitment, commitment._date, status)}
        className={`cal-task-block simple ${done ? "done" : "pending"}`}
        style={{ top }}
      >
        <span className="cal-task-time">
          {done ? <Check size={9} strokeWidth={3} /> : <Icon size={9} strokeWidth={2.25} />} {commitment.deadline_time?.slice(0, 5)}
        </span>
        <span className="cal-task-title">{commitment.title}</span>
      </button>
    );
  }

  return (
    <Link href={`/commitments/${commitment.id}`} className={`cal-task-block ${accentOf(status)}`} style={{ top }}>
      <span className="cal-task-time">
        <Icon size={9} strokeWidth={2.25} /> {commitment.deadline_time?.slice(0, 5)}
      </span>
      <span className="cal-task-title">{commitment.title}</span>
    </Link>
  );
}

export default function CalendarBoard({
  userId, weekDates, today, nowTop, showNowLine, poolByDay, itemsByDay, icloudEventsByDay,
}) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, setPending] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function toggleSimple(commitment, date, status) {
    setPending(commitment.id);
    const rpc = status === "approved" ? "reopen_simple_checkin" : "complete_simple_checkin";
    await supabase.rpc(rpc, { p_commitment_id: commitment.id, p_date: date });
    setPending(null);
    router.refresh();
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    const [, commitmentId] = active.id.split("::");
    const [, hour, minute] = over.id.split("::");
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    await supabase.rpc("set_commitment_time", { p_commitment_id: commitmentId, p_time: time });
    router.refresh();
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div className="cal-wrap">
        <div className="cal-grid">
          <div className="cal-corner" />
          {weekDates.map((d, i) => {
            const dayNum = Number(d.slice(8, 10));
            const isToday = d === today;
            return (
              <div key={d} className={`cal-header-cell ${isToday ? "today-col" : ""}`}>
                <span className="cal-day-label">{DAY_LABELS[i]}</span>
                <span className={`cal-day-num ${isToday ? "today" : ""}`}>{dayNum}</span>
                <Link href={`/commitments/quick?date=${d}`} className="cal-add-btn" title="Toevoegen op deze dag">
                  <Plus size={11} strokeWidth={2.5} />
                </Link>
              </div>
            );
          })}

          <div className="cal-allday-label">Gewoontes</div>
          {weekDates.map((d) => (
            <div key={d} className={`cal-allday-cell ${d === today ? "today-col" : ""}`}>
              {poolByDay[d].length === 0 && <span className="cal-allday-empty">—</span>}
              {poolByDay[d].map(({ commitment, status }) => (
                <HabitChip key={commitment.id} commitment={commitment} status={status} date={d} onToggle={toggleSimple} />
              ))}
            </div>
          ))}

          <div className="cal-time-axis" style={{ height: BODY_HEIGHT }}>
            {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i).map((h) => (
              <span key={h} className="cal-time-label" style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {weekDates.map((d) => {
            const items = itemsByDay[d];
            const isToday = d === today;
            const slots = [];
            for (let h = HOUR_START; h < HOUR_END; h++) {
              for (let m = 0; m < 60; m += SLOT_MIN) {
                slots.push({ h, m, top: (h - HOUR_START) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT });
              }
            }
            return (
              <div
                key={d}
                className={`cal-day-body ${isToday ? "today-col" : ""}`}
                style={{ height: BODY_HEIGHT, backgroundSize: `100% ${HOUR_HEIGHT}px` }}
              >
                {slots.map((s) => (
                  <DropSlot key={`${s.h}-${s.m}`} id={`slot::${s.h}::${s.m}`} top={s.top} />
                ))}

                {isToday && showNowLine && (
                  <div className="cal-now-line" style={{ top: nowTop }}>
                    <span className="cal-now-dot" />
                  </div>
                )}

                {items.map(({ commitment, status }) => (
                  <TaskBlock key={commitment.id} commitment={{ ...commitment, _date: d }} status={status} onToggle={toggleSimple} />
                ))}

                {icloudEventsByDay[d].map((ev, i) => {
                  const top = timeToTop(ev.time);
                  const height = Math.max(22, (ev.durationMinutes / 60) * HOUR_HEIGHT - 2);
                  return (
                    <div key={`ic-${d}-${i}`} className="cal-task-block icloud" style={{ top, height }} title={ev.calendarName}>
                      <span className="cal-task-time">
                        <Cloud size={9} strokeWidth={2.25} /> {ev.time}
                      </span>
                      <span className="cal-task-title">{ev.title}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}
