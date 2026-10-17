// Rules shared by the expense use cases. deps: { expenses }.
ExpenseTracking.Application.ExpenseSupportService = {
  LABEL: 'Expense',

  requireExpense: function (deps, id) {
    var expense = deps.expenses.findById(id);
    if (!expense) throw DomainError.notFound(ExpenseTracking.Application.ExpenseSupportService.LABEL, id);
    return expense;
  }
};
