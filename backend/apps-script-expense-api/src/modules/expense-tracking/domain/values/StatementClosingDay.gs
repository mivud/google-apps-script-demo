// Value object: the day of the month a payment method's statement closes (1-31). null means no billing cycle.
ExpenseTracking.Domain.StatementClosingDay = {
  MIN: 1,
  MAX: 31,

  parse: function (value) {
    if (value === undefined || value === null || value === '') return null;
    var rules = ExpenseTracking.Domain.StatementClosingDay;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < rules.MIN || value > rules.MAX) {
      throw DomainError.create(DomainError.CODE.PAYMENT_METHOD_CLOSING_DAY_INVALID);
    }
    return value;
  }
};
