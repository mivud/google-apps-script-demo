// Use case: record an expense. deps: { expenses, paymentMethods, audit, ids }. input: { actor, fields }.
// fields never include templateId: only generateFixed links an expense to a template.
// When statementMonth is omitted it comes from the payment method's closing day; an explicit one is validated and kept.
ExpenseTracking.Application.CreateExpense = {
  execute: function (deps, input) {
    var fields = ExpenseTracking.Application.CreateExpense.withStatementMonth(deps, input.fields);
    var expense = ExpenseTracking.Domain.Expense.create(Object.assign({}, fields, {
      id: deps.ids.newId(),
      audit: deps.audit.created(input.actor)
    }));
    ExpenseTracking.Application.PaymentMethodSupportService.assertReferenceExists(deps.paymentMethods, expense.paymentMethodId);
    deps.expenses.insert(expense);
    return expense;
  },

  withStatementMonth: function (deps, fields) {
    if (fields.statementMonth !== undefined && fields.statementMonth !== '') return fields;
    if (!fields.paymentMethodId) throw DomainError.create(DomainError.CODE.EXPENSE_PAYMENT_METHOD_REQUIRED);
    var domain = ExpenseTracking.Domain;
    var spentOn = domain.CalendarDate.parse(fields.spentOn);
    var method = ExpenseTracking.Application.PaymentMethodSupportService.requireReference(deps.paymentMethods, fields.paymentMethodId);
    return Object.assign({}, fields, { statementMonth: domain.StatementCycle.resolveStatementMonth(spentOn, method.statementClosingDay) });
  }
};
