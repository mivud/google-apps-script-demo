// Value object: an optional display colour, exactly #RRGGBB, stored lowercase. null means no colour.
ExpenseTracking.Domain.PaymentMethodColor = {
  PATTERN: /^#[0-9a-fA-F]{6}$/,

  parse: function (value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !ExpenseTracking.Domain.PaymentMethodColor.PATTERN.test(value)) {
      throw DomainError.create(DomainError.CODE.PAYMENT_METHOD_COLOR_INVALID);
    }
    return value.toLowerCase();
  }
};
