// Use case: change an expense (optimistic concurrency on last_modified).
// deps: { expenses, paymentMethods, audit }. input: { actor, id, patch, expectedLastModified }.
ExpenseTracking.Application.UpdateExpense = {
  execute: function (deps, input) {
    var expense = ExpenseTracking.Application.ExpenseSupportService.requireExpense(deps, input.id);
    ExpenseAuditStamper.assertUnchanged(expense.audit, input.expectedLastModified);
    var updated = ExpenseTracking.Domain.Expense.edit(expense, input.patch, deps.audit.modified(expense.audit, input.actor));
    ExpenseTracking.Application.PaymentMethodSupportService.assertReferenceExists(deps.paymentMethods, updated.paymentMethodId);
    deps.expenses.update(updated);
    return updated;
  }
};
