"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav({ pendingReviewCount = 0 }) {
  const pathname = usePathname();

  function active(href) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const navItems = [
    { href: "/", icon: "⊞", label: "Home" },
    { href: "/review", icon: "✓", label: "Beoordeel", badge: pendingReviewCount },
    { href: "/ledger", icon: "◈", label: "Schulden" },
    { href: "/account", icon: "◎", label: "Account" },
  ];

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {navItems.map(({ href, icon, label, badge }) => (
          <Link key={href} href={href} className={active(href) ? "active" : ""}>
            <span className="nav-icon">{icon}</span>
            {badge > 0 && <span className="nav-badge">{badge}</span>}
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Desktop sidebar */}
      <aside className="sidebar">
        <span style={{
          display: "block",
          color: "#fff",
          fontSize: "20px",
          fontWeight: 700,
          padding: "0 24px 32px",
          letterSpacing: "-0.02em",
        }}>
          Volhouder
        </span>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
          {navItems.map(({ href, icon, label, badge }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
                color: active(href) ? "#fff" : "rgba(255,255,255,0.6)",
                background: active(href) ? "rgba(255,255,255,0.1)" : "transparent",
                borderRadius: "0",
                transition: "background 0.15s ease, color 0.15s ease",
                position: "relative",
              }}
              onMouseEnter={e => {
                if (!active(href)) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "#fff";
                }
              }}
              onMouseLeave={e => {
                if (!active(href)) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                }
              }}
            >
              <span style={{ fontSize: "18px", lineHeight: 1 }}>{icon}</span>
              <span>{label}</span>
              {badge > 0 && (
                <span style={{
                  marginLeft: "auto",
                  background: "var(--danger)",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 700,
                  minWidth: "16px",
                  height: "16px",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                }}>
                  {badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
