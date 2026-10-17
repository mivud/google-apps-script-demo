// Value object: how many months a fixed expense template generates expenses for.
// Optional: missing, null, empty or 0 means unlimited (null). When set it is an integer from 1 to MAX.
ExpenseTracking.Domain.TotalMonths = {
  MAX: 1200,

  parse: function (value) {
    if (value === undefined || value === null || value === '' || value === 0) return null;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > ExpenseTracking.Domain.TotalMonths.MAX) {
      throw DomainError.create(DomainError.CODE.TOTAL_MONTHS_INVALID);
    }
    return value;
  }
};
