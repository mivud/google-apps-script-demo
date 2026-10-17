// Entity -> response JSON (snake_case, same names as the sheet and Postgres columns, audit columns last).
ExpenseTracking.Endpoints.ExpenseTrackingJsonMapper = {
  paymentMethod: function (source) {
    return Object.assign({
      id: source.id,
      name: source.name,
      active: source.active,
      statement_closing_day: source.statementClosingDay,
      color: source.color
    }, AuditColumns.toRow(source.audit));
  },

  template: function (template) {
    return Object.assign({
      id: template.id,
      description: template.description,
      amount: template.amount,
      payment_method_id: template.paymentMethodId === '' ? null : template.paymentMethodId,
      total_months: template.totalMonths,
      months_added: template.monthsAdded,
      active: template.active
    }, AuditColumns.toRow(template.audit));
  },

  expense: function (expense) {
    return Object.assign({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      payment_method_id: expense.paymentMethodId === '' ? null : expense.paymentMethodId,
      spent_on: expense.spentOn,
      statement_month: expense.statementMonth,
      is_fixed: expense.isFixed,
      template_id: expense.templateId === '' ? null : expense.templateId
    }, AuditColumns.toRow(expense.audit));
  },

  list: function (mapItem) {
    return function (result) { return { items: result.items.map(mapItem) }; };
  }
};
