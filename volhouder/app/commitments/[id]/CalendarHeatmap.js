"use client";

const STATUS_LABEL = {
  approved: "gelukt",
  missed: "gemist",
  rejected: "afgekeurd",
  submitted: "ingediend",
  pending: "nog te doen",
  disputed: "betwist",
};

function getLast3Months() {
  const now = new Date();
  const months = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("nl-BE", { month: "long", year: "numeric" }),
    });
  }
  return months;
}

function getDaysInMonth(year, month) {
  const days = [];
  const count = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= count; d++) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    days.push(`${year}-${mm}-${dd}`);
  }
  return days;
}

function getFirstDayOffset(year, month) {
  const dow = new Date(year, month, 1).getDay();
  return dow === 0 ? 6 : dow - 1;
}

function isDateDue(dateStr, frequency, daysOfWeek) {
  if (frequency === "daily") return true;
  if (frequency === "weekly" && daysOfWeek) {
    const dow = new Date(dateStr).getDay();
    return daysOfWeek.includes(dow);
  }
  return false;
}

function MonthGrid({ year, month, label, statusByDate, frequency, daysOfWeek }) {
  const days = getDaysInMonth(year, month);

  return (
    <div className="month-grid">
      <div className="month-label">{label}</div>
      <div className="weekday-headers">
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
          <span key={d} className="weekday-header">{d}</span>
        ))}
      </div>
      <div className="day-grid">
        {Array(getFirstDayOffset(year, month)).fill(null).map((_, i) => (
          <div key={`empty-${i}`} className="day-cell empty" />
        ))}
        {days.map((dateStr) => {
          const status = statusByDate[dateStr];
          const isDue = isDateDue(dateStr, frequency, daysOfWeek);
          return (
            <div
              key={dateStr}
              className={`day-cell ${status || (isDue ? "due" : "not-due")}`}
              title={`${dateStr}${status ? ` — ${STATUS_LABEL[status]}` : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarHeatmap({ history, frequency, daysOfWeek }) {
  const statusByDate = {};
  for (const ci of history) {
    statusByDate[ci.due_date] = ci.status;
  }

  const months = getLast3Months();

  return (
    <div className="calendar-heatmap">
      {months.map(({ year, month, label }) => (
        <MonthGrid
          key={`${year}-${month}`}
          year={year}
          month={month}
          label={label}
          statusByDate={statusByDate}
          frequency={frequency}
          daysOfWeek={daysOfWeek}
        />
      ))}
    </div>
  );
}
