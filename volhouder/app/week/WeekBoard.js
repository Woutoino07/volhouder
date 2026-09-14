"use client";

import { useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";

function Chip({ id, title }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        ...style,
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 13,
        fontWeight: 500,
        marginBottom: 6,
        cursor: "grab",
        touchAction: "none",
      }}
    >
      {title}
    </div>
  );
}

function DayColumn({ id, label, dateNum, chips }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        flex: "1 1 0",
        minWidth: 120,
        background: isOver ? "rgba(0,0,0,0.04)" : "transparent",
        border: "1px dashed var(--border)",
        borderRadius: 10,
        padding: 8,
        minHeight: 120,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
        {label} <span style={{ fontWeight: 400 }}>· {dateNum}</span>
      </div>
      {chips.map((c) => (
        <Chip key={c.id} id={c.id} title={c.title} />
      ))}
      {chips.length === 0 && <div style={{ fontSize: 11, color: "var(--muted-light)" }}>—</div>}
    </div>
  );
}

function PoolArea({ chips }) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" });
  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? "rgba(0,0,0,0.04)" : "transparent",
        border: "1px dashed var(--border)",
        borderRadius: 10,
        padding: 10,
        minHeight: 56,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      {chips.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--muted-light)" }}>Alles ingepland deze week.</div>
      )}
      {chips.map((c) => (
        <div key={c.id} style={{ marginBottom: 0 }}>
          <Chip id={c.id} title={c.title} />
        </div>
      ))}
    </div>
  );
}

const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export default function WeekBoard({ userId, weekDates, initialEntries, initialPool }) {
  const supabase = createClient();

  const [entriesByDate, setEntriesByDate] = useState(() => {
    const map = {};
    weekDates.forEach((d) => (map[d] = []));
    for (const e of initialEntries) {
      (map[e.planned_date] ||= []).push({ id: e.commitment_id, title: e.title });
    }
    return map;
  });
  const [pool, setPool] = useState(initialPool);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function persist(commitmentId, newDate) {
    await supabase
      .from("week_plan_entries")
      .delete()
      .eq("owner_id", userId)
      .eq("commitment_id", commitmentId)
      .gte("planned_date", weekDates[0])
      .lte("planned_date", weekDates[6]);

    if (newDate) {
      await supabase.from("week_plan_entries").insert({
        id: crypto.randomUUID(),
        owner_id: userId,
        commitment_id: commitmentId,
        planned_date: newDate,
      });
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const commitmentId = active.id;
    const targetId = over.id;

    let chip = pool.find((c) => c.id === commitmentId);
    let fromDate = null;
    if (!chip) {
      for (const d of weekDates) {
        const found = entriesByDate[d].find((c) => c.id === commitmentId);
        if (found) {
          chip = found;
          fromDate = d;
          break;
        }
      }
    }
    if (!chip) return;
    if ((fromDate || "pool") === targetId) return;

    setPool((prev) => prev.filter((c) => c.id !== commitmentId));
    setEntriesByDate((prev) => {
      const next = { ...prev };
      weekDates.forEach((d) => {
        next[d] = next[d].filter((c) => c.id !== commitmentId);
      });
      if (targetId !== "pool") {
        next[targetId] = [...next[targetId], chip];
      }
      return next;
    });
    if (targetId === "pool") {
      setPool((prev) => [...prev, chip]);
    }

    persist(commitmentId, targetId === "pool" ? null : targetId);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 24 }}>
        {weekDates.map((d, i) => (
          <DayColumn
            key={d}
            id={d}
            label={DAY_LABELS[i]}
            dateNum={new Date(d + "T12:00:00").getDate()}
            chips={entriesByDate[d]}
          />
        ))}
      </div>

      <div className="section-header">
        <span className="section-title" style={{ fontSize: 15, color: "var(--muted)" }}>
          Niet ingepland deze week
        </span>
      </div>
      <PoolArea chips={pool} />
    </DndContext>
  );
}
