// Domain service (pure): which statement month a spending belongs to for a payment method with a closing day.
ExpenseTracking.Domain.StatementCycle = {
  DECEMBER: 12,
  MONTH_FIELD_WIDTH: 2,

  // spentOn: valid YYYY-MM-DD. closingDay: 1-31 or null (no cycle). Spending on or before the closing day
  // (capped to the month length) stays in its own month; later spending goes to the next month.
  resolveStatementMonth: function (spentOn, closingDay) {
    var cycle = ExpenseTracking.Domain.StatementCycle;
    var ownMonth = ExpenseTracking.Domain.CalendarDate.monthOf(spentOn);
    if (closingDay === null) return ownMonth;
    var parts = spentOn.split('-').map(Number);
    var lastDay = new Date(Date.UTC(parts[0], parts[1], 0)).getUTCDate();
    if (parts[2] <= Math.min(closingDay, lastDay)) return ownMonth;
    return parts[1] === cycle.DECEMBER ? cycle.format(parts[0] + 1, 1) : cycle.format(parts[0], parts[1] + 1);
  },

  format: function (year, month) {
    var padded = String(month);
    while (padded.length < ExpenseTracking.Domain.StatementCycle.MONTH_FIELD_WIDTH) padded = '0' + padded;
    return year + '-' + padded;
  }
};
