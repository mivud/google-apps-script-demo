// Value object: the card statement month an expense is billed to, as YYYY-MM.
ExpenseTracking.Domain.StatementMonth = {
  PATTERN: /^\d{4}-(0[1-9]|1[0-2])$/,

  parse: function (text) {
    if (typeof text !== 'string' || !ExpenseTracking.Domain.StatementMonth.PATTERN.test(text)) {
      throw DomainError.create(DomainError.CODE.STATEMENT_MONTH_INVALID);
    }
    return text;
  }
};
