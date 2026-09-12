"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav({ pendingReviewCount = 0 }) {
  const pathname = usePathname();

  function active(href) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="bottom-nav">
      <Link href="/" className={active("/") ? "active" : ""}>
        <span className="nav-icon">⊞</span>
        <span>Home</span>
      </Link>

      <Link href="/review" className={active("/review") ? "active" : ""}>
        <span className="nav-icon">✓</span>
        {pendingReviewCount > 0 && (
          <span className="nav-badge">{pendingReviewCount}</span>
        )}
        <span>Beoordeel</span>
      </Link>

      <Link href="/ledger" className={active("/ledger") ? "active" : ""}>
        <span className="nav-icon">◈</span>
        <span>Schulden</span>
      </Link>

      <Link href="/account" className={active("/account") ? "active" : ""}>
        <span className="nav-icon">◎</span>
        <span>Account</span>
      </Link>
    </nav>
  );
}
