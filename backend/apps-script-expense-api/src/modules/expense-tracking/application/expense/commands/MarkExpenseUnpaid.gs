// Use case: clear the paid mark of a fixed expense.
// deps: { expenses, audit }. input: { actor, id }.
ExpenseTracking.Application.MarkExpenseUnpaid = {
  execute: function (deps, input) {
    var expense = ExpenseTracking.Application.ExpenseSupportService.requireExpense(deps, input.id);
    var unpaid = ExpenseTracking.Domain.Expense.markUnpaid(expense, deps.audit.modified(expense.audit, input.actor));
    deps.expenses.update(unpaid);
    return unpaid;
  }
};
