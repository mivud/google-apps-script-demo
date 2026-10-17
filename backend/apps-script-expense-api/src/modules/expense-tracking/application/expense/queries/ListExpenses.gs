// Use case: expenses of one statement month, newest first. deps: { expenses }. input: { statementMonth }.
ExpenseTracking.Application.ListExpenses = {
  execute: function (deps, input) {
    var month = ExpenseTracking.Domain.StatementMonth.parse(input.statementMonth);
    var items = deps.expenses.listByStatementMonth(month).sort(ExpenseTracking.Domain.Expense.compareNewestFirst);
    return { items: items };
  }
};
