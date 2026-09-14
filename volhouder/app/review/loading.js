import Nav from "@/components/Nav";

export default function LoadingReview() {
  return (
    <>
      <Nav />
      <div className="shell">
        <div className="page-header">
          <div className="skeleton" style={{ width: 120, height: 24, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 200, height: 14 }} />
        </div>

        <div className="card-section" style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "14px 18px", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
              <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: "60%", height: 14, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: "40%", height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
