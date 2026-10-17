// Value object: the client-chosen id of a payment method, e.g. "visa-1234" or "cash".
// Trimmed, 1-40 chars, only a-z 0-9 _ -. Uppercase is rejected, never silently changed. Immutable after create.
ExpenseTracking.Domain.PaymentMethodId = {
  MAX_LENGTH: 40,
  PATTERN: /^[a-z0-9_-]+$/,

  parse: function (text) {
    var id = typeof text === 'string' ? text.trim() : '';
    var rules = ExpenseTracking.Domain.PaymentMethodId;
    if (id.length < 1 || id.length > rules.MAX_LENGTH || !rules.PATTERN.test(id)) {
      throw DomainError.create(DomainError.CODE.PAYMENT_METHOD_ID_INVALID);
    }
    return id;
  }
};
