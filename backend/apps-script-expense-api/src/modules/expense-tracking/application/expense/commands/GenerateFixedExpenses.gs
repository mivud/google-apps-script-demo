// Use case: create the fixed expenses of a statement month. Idempotent per (template, month): a template that already
// has an expense for the month is skipped, so re-running never counts the month twice. The caller holds the write lock.
// The expense is saved before the template counter, so a failure midway never counts a month that has no expense.
// deps: { expenses, templates, audit, ids }. input: { actor, statementMonth }.
ExpenseTracking.Application.GenerateFixedExpenses = {
  execute: function (deps, input) {
    var domain = ExpenseTracking.Domain;
    var month = domain.StatementMonth.parse(input.statementMonth);
    var existing = deps.expenses.listByStatementMonth(month);
    var active = deps.templates.list().filter(function (template) { return template.active; });
    var due = active.filter(function (template) {
      return domain.FixedExpenseTemplate.canGenerate(template) && !ExpenseTracking.Application.GenerateFixedExpenses.hasExpense(existing, template);
    });
    var items = due.map(function (template) { return ExpenseTracking.Application.GenerateFixedExpenses.generate(deps, input, template, month); });
    // skipped: active templates that produced nothing (already generated for the month or already completed).
    return { items: items, skipped: active.length - items.length };
  },

  hasExpense: function (expenses, template) {
    return expenses.some(function (expense) { return expense.templateId === template.id; });
  },

  generate: function (deps, input, template, month) {
    var domain = ExpenseTracking.Domain;
    var recorded = domain.FixedExpenseTemplate.recordGenerated(template, deps.audit.modified(template.audit, input.actor));
    var expense = domain.Expense.fromTemplate(template, month, {
      id: deps.ids.newId(),
      description: domain.FixedExpenseTemplate.describeInstallment(recorded),
      audit: deps.audit.created(input.actor)
    });
    deps.expenses.insert(expense);
    deps.templates.update(recorded);
    return expense;
  }
};
