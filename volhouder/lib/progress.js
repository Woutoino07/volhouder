// Aggregaties voor de Progressie-pagina. Puur functies op ruwe rijen
// (check_ins, ledger_entries, commitments) — geen Supabase-calls hier.

function mondayOf(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Slaagpercentage per week, laatste `weeks` weken (meest recente laatst).
export function weeklySuccessTrend(checkIns, weeks = 8) {
  const decided = checkIns.filter((c) => ["approved", "missed", "rejected"].includes(c.status));
  const byWeek = {};
  for (const c of decided) {
    const wk = mondayOf(c.due_date);
    (byWeek[wk] ||= []).push(c.status);
  }

  const result = [];
  const today = new Date();
  const thisMonday = new Date(mondayOf(today.toISOString().slice(0, 10)));
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() - i * 7);
    const wk = d.toISOString().slice(0, 10);
    const statuses = byWeek[wk] || [];
    const approved = statuses.filter((s) => s === "approved").length;
    result.push({
      weekStart: wk,
      total: statuses.length,
      rate: statuses.length > 0 ? Math.round((approved / statuses.length) * 100) : null,
    });
  }
  return result;
}

// Verloren geld per maand (laatste `months` maanden), enkel wat jij verschuldigd bent.
export function moneyLostByMonth(ledgerEntries, userId, months = 6) {
  const mine = ledgerEntries.filter((l) => l.debtor_id === userId);
  const byMonth = {};
  for (const l of mine) {
    const key = l.created_at.slice(0, 7); // YYYY-MM
    byMonth[key] = (byMonth[key] || 0) + Number(l.amount);
  }

  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({
      month: key,
      label: d.toLocaleDateString("nl-BE", { month: "short" }),
      amount: byMonth[key] || 0,
    });
  }
  return result;
}

// Slaagpercentage bij commitments met vs. zonder geldinzet.
export function stakeEffectiveness(commitments, checkIns) {
  const stakeById = {};
  for (const c of commitments) stakeById[c.id] = Number(c.money_stake) > 0;

  const decided = checkIns.filter((c) => ["approved", "missed", "rejected"].includes(c.status));
  const withStake = decided.filter((c) => stakeById[c.commitment_id]);
  const withoutStake = decided.filter((c) => !stakeById[c.commitment_id]);

  function summarize(list) {
    const approved = list.filter((c) => c.status === "approved").length;
    return { total: list.length, rate: list.length > 0 ? Math.round((approved / list.length) * 100) : null };
  }

  return { withStake: summarize(withStake), withoutStake: summarize(withoutStake) };
}

// Gemiddelde tijd (in uren) tussen indienen en beoordelen door een partner.
export function reviewSpeedHours(checkIns) {
  const reviewed = checkIns.filter((c) => c.submitted_at && c.judged_at);
  if (reviewed.length === 0) return null;
  const totalHours = reviewed.reduce((sum, c) => {
    return sum + (new Date(c.judged_at) - new Date(c.submitted_at)) / 3600000;
  }, 0);
  return totalHours / reviewed.length;
}

// Schuld: opgebouwd vs. afbetaald per maand (laatste `months` maanden).
export function debtBalanceByMonth(ledgerEntries, userId, months = 6) {
  const mine = ledgerEntries.filter((l) => l.debtor_id === userId);
  const accruedByMonth = {};
  const settledByMonth = {};
  for (const l of mine) {
    const accruedKey = l.created_at.slice(0, 7);
    accruedByMonth[accruedKey] = (accruedByMonth[accruedKey] || 0) + Number(l.amount);
    if (l.settled && l.settled_at) {
      const settledKey = l.settled_at.slice(0, 7);
      settledByMonth[settledKey] = (settledByMonth[settledKey] || 0) + Number(l.amount);
    }
  }

  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({
      month: key,
      label: d.toLocaleDateString("nl-BE", { month: "short" }),
      accrued: accruedByMonth[key] || 0,
      settled: settledByMonth[key] || 0,
    });
  }
  return result;
}

// Ranking van commitments op slaagpercentage (zwakste eerst).
export function commitmentRanking(commitments, checkIns, ledgerEntries, userId) {
  return commitments
    .map((c) => {
      const decided = checkIns.filter(
        (ci) => ci.commitment_id === c.id && ["approved", "missed", "rejected"].includes(ci.status)
      );
      const approved = decided.filter((ci) => ci.status === "approved").length;
      const rate = decided.length > 0 ? Math.round((approved / decided.length) * 100) : null;
      const moneyLost = ledgerEntries
        .filter((l) => l.commitment_id === c.id && l.debtor_id === userId)
        .reduce((sum, l) => sum + Number(l.amount), 0);
      return { id: c.id, title: c.title, rate, total: decided.length, moneyLost };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100));
}
