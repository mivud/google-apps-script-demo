// Value object: the name of a payment method. Trimmed, 1-60 characters, unique ignoring case.
ExpenseTracking.Domain.PaymentMethodName = {
  MAX_LENGTH: 60,

  normalize: function (text) {
    var name = typeof text === 'string' ? text.trim() : '';
    if (name.length < 1 || name.length > ExpenseTracking.Domain.PaymentMethodName.MAX_LENGTH) {
      throw DomainError.create(DomainError.CODE.PAYMENT_METHOD_NAME_INVALID);
    }
    return name;
  },

  same: function (a, b) {
    return String(a).toLowerCase() === String(b).toLowerCase();
  }
};
