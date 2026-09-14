import Nav from "@/components/Nav";

export default function LoadingInsights() {
  return (
    <>
      <Nav />
      <div className="shell shell-wide">
        <div className="dashboard-header">
          <div className="skeleton" style={{ width: 140, height: 26, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 220, height: 14 }} />
        </div>

        <div className="habit-card-grid" style={{ marginTop: 20 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton" style={{ width: 100, height: 14, marginBottom: 14 }} />
              <div className="skeleton" style={{ width: 60, height: 28, marginBottom: 14 }} />
              <div className="skeleton" style={{ width: "100%", height: 36 }} />
            </div>
          ))}
        </div>

        {[0, 1].map((i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton" style={{ width: 160, height: 16, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: "100%", height: 120 }} />
          </div>
        ))}
      </div>
    </>
  );
}
