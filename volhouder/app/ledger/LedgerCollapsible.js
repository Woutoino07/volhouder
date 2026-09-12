"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function LedgerCollapsible({ count, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card-section">
      <button
        onClick={() => setOpen((v) => !v)}
        className="card-section-header"
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0, textAlign: "left" }}
      >
        <h2 style={{ margin: 0 }}>Afgehandeld ({count})</h2>
        {open
          ? <ChevronDown size={16} strokeWidth={1.75} style={{ color: "var(--muted)" }} />
          : <ChevronRight size={16} strokeWidth={1.75} style={{ color: "var(--muted)" }} />
        }
      </button>
      {open && children}
    </div>
  );
}
