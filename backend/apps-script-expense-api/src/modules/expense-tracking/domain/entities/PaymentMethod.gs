// Entity (aggregate root): a way of paying (card, cash, wallet). Referenced by id only.
// Shape: { id, name, active, statementClosingDay (1-31 or null), color (#rrggbb or null), audit }.
// The id is chosen by the client at create time and never changes.
ExpenseTracking.Domain.PaymentMethod = {
  create: function (fields) {
    return {
      id: ExpenseTracking.Domain.PaymentMethodId.parse(fields.id),
      name: ExpenseTracking.Domain.PaymentMethodName.normalize(fields.name),
      active: fields.active !== false,
      statementClosingDay: ExpenseTracking.Domain.StatementClosingDay.parse(fields.statementClosingDay),
      color: ExpenseTracking.Domain.PaymentMethodColor.parse(fields.color),
      audit: fields.audit
    };
  },

  // patch holds only the fields the client wants to change; the id is forced back to the stored one.
  edit: function (method, patch, audit) {
    return ExpenseTracking.Domain.PaymentMethod.create(Object.assign({}, method, patch, { id: method.id, audit: audit }));
  }
};
