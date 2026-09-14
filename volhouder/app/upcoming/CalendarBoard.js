"use client";

import { useEffect, useRef, useState } from "react";
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
import { useToast } from "@/components/ToastProvider";
import RescheduleSheet from "./RescheduleSheet";

const DAY_LABELS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const DAY_LABELS_FULL = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const HOUR_START = 6;
const HOUR_END = 24;
const HOUR_HEIGHT = 56; // px per uur
const SLOT_MIN = 15; // sleep-precisie in minuten
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

function isPast(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`) < new Date();
}

function useIsCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setCoarse(mq.matches);
    const onChange = (e) => setCoarse(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return coarse;
}

// Lang-indrukken op mobiel — vervangt slepen, opent een actiemenu.
function useLongPress(onLongPress, enabled) {
  const timer = useRef(null);
  const moved = useRef(false);

  function start() {
    if (!enabled) return;
    moved.current = false;
    timer.current = window.setTimeout(() => {
      if (!moved.current) onLongPress();
    }, 480);
  }
  function move() {
    moved.current = true;
    if (timer.current) window.clearTimeout(timer.current);
  }
  function end() {
    if (timer.current) window.clearTimeout(timer.current);
  }

  return {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: end,
    onPointerLeave: end,
  };
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

// ── Droppable kwartier-vak (onzichtbaar, achter de blokken) ───
function DropSlot({ id, top, invalid }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`cal-drop-slot ${isOver ? "over" : ""} ${isOver && invalid ? "invalid" : ""}`}
      style={{ top, height: (HOUR_HEIGHT * SLOT_MIN) / 60 }}
    />
  );
}

// ── Positioned taak/commitment-blok ────────────────
function TaskBlock({ commitment, status, naturalDate, onToggle, onRequestReschedule, draggable, dragId }) {
  const top = timeToTop(commitment.deadline_time);
  const Icon = inferIcon(commitment.title);
  const done = status === "approved";

  const drag = useDraggable({ id: dragId, disabled: !draggable });
  const longPress = useLongPress(() => onRequestReschedule(commitment, naturalDate), !draggable);

  const dragStyle = drag.transform
    ? {
        transform: `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0)`,
        opacity: 0.6,
        boxShadow: "0 12px 28px rgba(33,12,55,0.28)",
        cursor: "grabbing",
        zIndex: 40,
      }
    : { cursor: draggable ? "grab" : undefined };

  if (commitment.isSimple) {
    return (
      <div
        ref={draggable ? drag.setNodeRef : undefined}
        className={`cal-task-block simple ${done ? "done" : "pending"} ${drag.isDragging ? "ghost-source" : ""}`}
        style={{ top, ...dragStyle }}
        {...(draggable ? { ...drag.listeners, ...drag.attributes } : longPress)}
      >
        <button
          type="button"
          onClick={() => onToggle(commitment, naturalDate, status)}
          style={{ all: "unset", display: "flex", flexDirection: "column", width: "100%", cursor: "pointer" }}
        >
          <span className="cal-task-time">
            {done ? <Check size={9} strokeWidth={3} /> : <Icon size={9} strokeWidth={2.25} />} {commitment.deadline_time?.slice(0, 5)}
          </span>
          <span className="cal-task-title">{commitment.title}</span>
        </button>
      </div>
    );
  }

  return (
    <Link
      ref={draggable ? drag.setNodeRef : undefined}
      href={draggable && drag.isDragging ? "#" : `/commitments/${commitment.id}`}
      onClick={(e) => { if (drag.isDragging) e.preventDefault(); }}
      className={`cal-task-block ${accentOf(status)} ${drag.isDragging ? "ghost-source" : ""}`}
      style={{ top, ...dragStyle }}
      {...(draggable ? { ...drag.listeners, ...drag.attributes } : longPress)}
    >
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
  const { showToast } = useToast();
  const isCoarsePointer = useIsCoarsePointer();

  const [sheetTarget, setSheetTarget] = useState(null); // { commitment, naturalDate }
  const [pendingDrop, setPendingDrop] = useState(null); // { commitment, naturalDate, newDate, newTime }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function applyReschedule(commitment, naturalDate, newDate, newTime, applyToSeries) {
    await supabase.rpc("reschedule_checkin", {
      p_commitment_id: commitment.id,
      p_original_date: naturalDate,
      p_new_date: newDate,
      p_new_time: newTime,
      p_apply_to_series: applyToSeries,
    });

    const dayLabel = newDate === today ? "vandaag" : DAY_LABELS_FULL[new Date(newDate + "T12:00:00").getDay()];
    showToast(`Verplaatst naar ${dayLabel} ${newTime}`, {
      actionLabel: "Ongedaan maken",
      duration: 5000,
      onAction: async () => {
        if (applyToSeries) {
          await supabase.rpc("reschedule_checkin", {
            p_commitment_id: commitment.id,
            p_original_date: naturalDate,
            p_new_date: null,
            p_new_time: commitment.deadline_time,
            p_apply_to_series: true,
          });
        } else {
          await supabase.rpc("reschedule_checkin", {
            p_commitment_id: commitment.id,
            p_original_date: naturalDate,
            p_new_date: null,
            p_new_time: null,
            p_apply_to_series: false,
          });
        }
        router.refresh();
      },
    });
    router.refresh();
  }

  async function toggleSimple(commitment, date, status) {
    const rpc = status === "approved" ? "reopen_simple_checkin" : "complete_simple_checkin";
    await supabase.rpc(rpc, { p_commitment_id: commitment.id, p_date: date });
    router.refresh();
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    if (String(active.id).startsWith("habit::")) {
      const [, commitmentId] = active.id.split("::");
      const [, , hour, minute] = over.id.split("::");
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      supabase.rpc("set_commitment_time", { p_commitment_id: commitmentId, p_time: time }).then(() => router.refresh());
      return;
    }

    const [, commitmentId, naturalDate] = active.id.split("::");
    const [, date, hour, minute] = over.id.split("::");
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    if (isPast(date, time)) return; // stil genegeerd — het blok springt terug

    const commitment = findCommitment(commitmentId);
    if (!commitment) return;

    if (commitment.frequency !== "once") {
      setPendingDrop({ commitment, naturalDate, newDate: date, newTime: time });
    } else {
      applyReschedule(commitment, naturalDate, date, time, false);
    }
  }

  function findCommitment(id) {
    for (const d of weekDates) {
      const hit = [...itemsByDay[d], ...poolByDay[d]].find((e) => e.commitment.id === id);
      if (hit) return hit.commitment;
    }
    return null;
  }

  const slots = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    for (let m = 0; m < 60; m += SLOT_MIN) {
      slots.push({ h, m, top: (h - HOUR_START) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT });
    }
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
            return (
              <div
                key={d}
                className={`cal-day-body ${isToday ? "today-col" : ""}`}
                style={{ height: BODY_HEIGHT, backgroundSize: `100% ${HOUR_HEIGHT}px` }}
              >
                {!isCoarsePointer && slots.map((s) => (
                  <DropSlot key={`${s.h}-${s.m}`} id={`slot::${d}::${s.h}::${s.m}`} top={s.top} invalid={isPast(d, `${String(s.h).padStart(2,"0")}:${String(s.m).padStart(2,"0")}`)} />
                ))}

                {isToday && showNowLine && (
                  <div className="cal-now-line" style={{ top: nowTop }}>
                    <span className="cal-now-dot" />
                  </div>
                )}

                {items.map(({ commitment, status, naturalDate }) => (
                  <TaskBlock
                    key={`${commitment.id}_${naturalDate}`}
                    commitment={commitment}
                    status={status}
                    naturalDate={naturalDate}
                    onToggle={toggleSimple}
                    onRequestReschedule={(c, nd) => setSheetTarget({ commitment: c, naturalDate: nd })}
                    draggable={!isCoarsePointer}
                    dragId={`item::${commitment.id}::${naturalDate}`}
                  />
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

      {pendingDrop && (
        <SeriesChoiceDialog
          commitment={pendingDrop.commitment}
          newDate={pendingDrop.newDate}
          newTime={pendingDrop.newTime}
          onClose={() => setPendingDrop(null)}
          onChoose={(applyToSeries) => {
            const { commitment, naturalDate, newDate, newTime } = pendingDrop;
            setPendingDrop(null);
            applyReschedule(commitment, naturalDate, newDate, newTime, applyToSeries);
          }}
        />
      )}

      {sheetTarget && (
        <RescheduleSheet
          commitment={sheetTarget.commitment}
          naturalDate={sheetTarget.naturalDate}
          today={today}
          onClose={() => setSheetTarget(null)}
          onSubmit={(newDate, newTime, applyToSeries) => {
            setSheetTarget(null);
            applyReschedule(sheetTarget.commitment, sheetTarget.naturalDate, newDate, newTime, applyToSeries);
          }}
        />
      )}
    </DndContext>
  );
}

function SeriesChoiceDialog({ commitment, newDate, newTime, onClose, onChoose }) {
  const dayLabel = new Date(newDate + "T12:00:00").toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 4 }}>"{commitment.title}" herplannen</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
          Naar {dayLabel} om {newTime}. Dit is een terugkerende gewoonte — wat wil je verplaatsen?
        </p>
        <button type="button" className="btn-full" style={{ width: "100%", marginBottom: 8 }} onClick={() => onChoose(false)}>
          Alleen deze dag
        </button>
        <button type="button" className="btn secondary" style={{ width: "100%", marginBottom: 8 }} onClick={() => onChoose(true)}>
          Deze en alle volgende
        </button>
        <button type="button" onClick={onClose} style={{ width: "100%", background: "none", color: "var(--muted)", boxShadow: "none" }}>
          Annuleren
        </button>
      </div>
    </div>
  );
}
