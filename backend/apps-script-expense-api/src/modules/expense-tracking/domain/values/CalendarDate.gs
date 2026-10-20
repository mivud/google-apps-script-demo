// Value object: a calendar day as YYYY-MM-DD text. Impossible dates (2026-02-30) are rejected.
ExpenseTracking.Domain.CalendarDate = {
  PATTERN: /^(\d{4})-(\d{2})-(\d{2})$/,
  MONTH_LENGTH: 7,

  parse: function (text) {
    var parts = typeof text === 'string' ? ExpenseTracking.Domain.CalendarDate.PATTERN.exec(text) : null;
    if (!parts) throw DomainError.create(DomainError.CODE.SPENT_ON_INVALID);
    var year = Number(parts[1]), month = Number(parts[2]), day = Number(parts[3]);
    var date = new Date(Date.UTC(year, month - 1, day));
    // Date.UTC rolls over invalid days and maps years 0-99 to 19xx; both show up as a mismatch here.
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw DomainError.create(DomainError.CODE.SPENT_ON_INVALID);
    }
    return text;
  },

  monthOf: function (date) {
    return date.slice(0, ExpenseTracking.Domain.CalendarDate.MONTH_LENGTH);
  },

  firstDayOf: function (statementMonth) {
    return statementMonth + '-01';
  },

  // The given day of a month (YYYY-MM), clamped to the month's last day (31 in February -> 28 or 29).
  dayOf: function (statementMonth, day) {
    var year = Number(statementMonth.slice(0, 4)), month = Number(statementMonth.slice(5, 7));
    // Day 0 of the next month is the last day of this one.
    var lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    var padded = String(Math.min(day, lastDay));
    return statementMonth + '-' + (padded.length < 2 ? '0' + padded : padded);
  }
};
