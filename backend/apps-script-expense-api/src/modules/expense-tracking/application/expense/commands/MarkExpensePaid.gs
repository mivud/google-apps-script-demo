// Use case: record that a fixed expense was paid now (idempotent: paying again just moves the time).
// deps: { expenses, audit, clock }. input: { actor, id }.
ExpenseTracking.Application.MarkExpensePaid = {
  execute: function (deps, input) {
    var expense = ExpenseTracking.Application.ExpenseSupportService.requireExpense(deps, input.id);
    var paidAt = AuditRules.formatUtc(deps.clock.now());
    var paid = ExpenseTracking.Domain.Expense.markPaid(expense, paidAt, deps.audit.modified(expense.audit, input.actor));
    deps.expenses.update(paid);
    return paid;
  }
};
