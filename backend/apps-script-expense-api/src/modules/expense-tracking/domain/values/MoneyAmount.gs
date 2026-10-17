// Value object: an amount of money in whole VND. Positive integers only.
ExpenseTracking.Domain.MoneyAmount = {
  MAX: 1000000000000,

  parse: function (value) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > ExpenseTracking.Domain.MoneyAmount.MAX) {
      throw DomainError.create(DomainError.CODE.AMOUNT_INVALID);
    }
    return value;
  },

  // Optional variant: missing, null, empty or 0 means "no amount yet" (null); anything else must be a valid amount.
  parseOptional: function (value) {
    if (value === undefined || value === null || value === '' || value === 0) return null;
    return ExpenseTracking.Domain.MoneyAmount.parse(value);
  }
};
