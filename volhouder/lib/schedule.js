// Bepaalt of een commitment op een gegeven datum aan de beurt is,
// puur op basis van frequency/days_of_week/once_date (geen DB-call).
export function isDueOnDate(commitment, dateStr) {
  if (commitment.frequency === "daily") return true;
  if (commitment.frequency === "weekly" && commitment.days_of_week) {
    const dow = new Date(dateStr + "T12:00:00").getDay();
    return commitment.days_of_week.includes(dow);
  }
  if (commitment.frequency === "once") return commitment.once_date === dateStr;
  return false;
}
