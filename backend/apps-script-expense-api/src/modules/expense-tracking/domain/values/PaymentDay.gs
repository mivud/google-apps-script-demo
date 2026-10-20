// Value object: the day of the month a fixed expense is paid. Optional: missing, null or empty means none (null).
// When set it is an integer from 1 to MAX; months with fewer days clamp it (see CalendarDate.dayOf).
ExpenseTracking.Domain.PaymentDay = {
  MIN: 1,
  MAX: 31,

  parse: function (value) {
    var day = ExpenseTracking.Domain.PaymentDay;
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < day.MIN || value > day.MAX) {
      throw DomainError.create(DomainError.CODE.PAYMENT_DAY_INVALID);
    }
    return value;
  }
};
