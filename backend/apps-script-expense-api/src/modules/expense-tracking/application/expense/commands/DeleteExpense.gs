// Use case: delete an expense. A generated expense does not give its month back to the template.
// deps: { expenses }. input: { id }.
ExpenseTracking.Application.DeleteExpense = {
  execute: function (deps, input) {
    var expense = ExpenseTracking.Application.ExpenseSupportService.requireExpense(deps, input.id);
    deps.expenses.delete(expense.id);
    return {};
  }
};
