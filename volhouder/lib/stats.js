// Berekent reeks (streak) en slaagpercentage uit een lijst check-ins,
// meest recente due_date eerst. Check-ins die nog niet beslecht zijn
// (pending, submitted, disputed) tellen niet mee en onderbreken de reeks niet.
export function computeStats(history) {
  const decided = history.filter((h) => ["approved", "missed", "rejected"].includes(h.status));
  const successCount = decided.filter((h) => h.status === "approved").length;
  const failCount = decided.length - successCount;
  const rate = decided.length > 0 ? Math.round((successCount / decided.length) * 100) : null;

  let streak = 0;
  for (const h of decided) {
    if (h.status === "approved") streak++;
    else break;
  }

  return { successCount, failCount, rate, streak, total: decided.length };
}
