import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { CreditCard, User, ChevronRight } from "lucide-react";

export default async function MorePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: openDebts } = await supabase
    .from("ledger_entries")
    .select("amount, debtor_id")
    .eq("settled", false)
    .or(`debtor_id.eq.${user.id},creditor_id.eq.${user.id}`);

  const owedByMe = (openDebts || [])
    .filter((d) => d.debtor_id === user.id)
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const items = [
    {
      href: "/ledger",
      icon: <CreditCard size={18} strokeWidth={1.75} />,
      label: "Schulden",
      sub: owedByMe > 0 ? `Jij bent €${owedByMe.toFixed(2)} verschuldigd` : "Niets openstaand",
      tint: owedByMe > 0 ? "warning" : "accent",
    },
    {
      href: "/account",
      icon: <User size={18} strokeWidth={1.75} />,
      label: "Account",
      sub: "Profiel & online betalen",
      tint: "accent",
    },
  ];

  const TINTS = {
    accent: { bg: "var(--accent-light)", color: "var(--navy)" },
    warning: { bg: "var(--warning-bg)", color: "var(--warning)" },
  };

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="dashboard-header">
          <div className="dashboard-greeting">Meer</div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          {items.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "18px 20px",
                textDecoration: "none",
                color: "inherit",
                borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{
                width: 38, height: 38, borderRadius: 11,
                background: TINTS[item.tint].bg, color: TINTS[item.tint].color,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {item.icon}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--black)" }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{item.sub}</div>
              </span>
              <ChevronRight size={16} strokeWidth={2} style={{ color: "var(--muted-light)", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
