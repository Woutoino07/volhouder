import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { CheckSquare, CreditCard, User, ChevronRight } from "lucide-react";

export default async function MorePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myPartnerCommitments } = await supabase
    .from("commitment_partners")
    .select("commitment_id")
    .eq("profile_id", user.id);
  const partnerCommitmentIds = (myPartnerCommitments || []).map((r) => r.commitment_id);

  let pendingReviewCount = 0;
  if (partnerCommitmentIds.length > 0) {
    const { count } = await supabase
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted")
      .in("commitment_id", partnerCommitmentIds);
    pendingReviewCount = count || 0;
  }

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
      href: "/review",
      icon: <CheckSquare size={18} strokeWidth={1.75} />,
      label: "Beoordeel",
      sub: pendingReviewCount > 0 ? `${pendingReviewCount} wachten op jou` : "Niets openstaand",
      badge: pendingReviewCount,
    },
    {
      href: "/ledger",
      icon: <CreditCard size={18} strokeWidth={1.75} />,
      label: "Schulden",
      sub: owedByMe > 0 ? `Jij bent €${owedByMe.toFixed(2)} verschuldigd` : "Niets openstaand",
    },
    {
      href: "/account",
      icon: <User size={18} strokeWidth={1.75} />,
      label: "Account",
      sub: "Profiel & online betalen",
    },
  ];

  return (
    <>
      <Nav pendingReviewCount={pendingReviewCount} />
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
                padding: "16px 18px",
                textDecoration: "none",
                color: "inherit",
                borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{
                width: 36, height: 36, borderRadius: 10,
                background: "var(--accent-light)", color: "var(--navy)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {item.icon}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--black)" }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{item.sub}</div>
              </span>
              {item.badge > 0 && (
                <span style={{
                  background: "var(--danger)", color: "#fff", fontSize: 11, fontWeight: 700,
                  minWidth: 18, height: 18, borderRadius: 999, display: "flex",
                  alignItems: "center", justifyContent: "center", padding: "0 5px",
                }}>
                  {item.badge}
                </span>
              )}
              <ChevronRight size={16} strokeWidth={2} style={{ color: "var(--muted-light)", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
