import Nav from "@/components/Nav";

export default function LoadingUpcoming() {
  return (
    <>
      <Nav />
      <div className="shell shell-wide">
        <div className="dashboard-header">
          <div className="skeleton" style={{ width: 140, height: 26, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 160, height: 14 }} />
        </div>
        <div className="cal-layout">
          <div className="skeleton-card" style={{ flex: 1, height: 480 }} />
          <div className="page-aside">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-card" style={{ height: 90 }} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
