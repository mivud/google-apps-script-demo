// Entity (aggregate root): one spending. Shape: { id, description, amount, paymentMethodId, spentOn, statementMonth,
// isFixed, templateId ('' when none), audit }. statementMonth defaults to the month of spentOn.
// amount and paymentMethodId ('' = none) are empty only for rows generated from a template that lacks them; manual expenses have both.
ExpenseTracking.Domain.Expense = {
  create: function (fields) {
    var domain = ExpenseTracking.Domain;
    var spentOn = domain.CalendarDate.parse(fields.spentOn);
    var hasMonth = fields.statementMonth !== undefined && fields.statementMonth !== '';
    return {
      id: fields.id,
      description: domain.ExpenseDescription.normalize(fields.description),
      amount: ExpenseTracking.Domain.Expense.amountFor(fields),
      paymentMethodId: ExpenseTracking.Domain.Expense.paymentMethodFor(fields),
      spentOn: spentOn,
      statementMonth: hasMonth ? domain.StatementMonth.parse(fields.statementMonth) : domain.CalendarDate.monthOf(spentOn),
      isFixed: fields.isFixed === true,
      templateId: fields.templateId || '',
      audit: fields.audit
    };
  },

  // Manual expenses need a positive amount; template-generated ones may still be waiting for it.
  amountFor: function (fields) {
    var amount = ExpenseTracking.Domain.MoneyAmount;
    if (fields.templateId) return amount.parseOptional(fields.amount);
    if (fields.amount === undefined || fields.amount === null || fields.amount === '') {
      throw DomainError.create(DomainError.CODE.EXPENSE_AMOUNT_REQUIRED);
    }
    return amount.parse(fields.amount);
  },

  paymentMethodFor: function (fields) {
    if (!fields.templateId && !fields.paymentMethodId) throw DomainError.create(DomainError.CODE.EXPENSE_PAYMENT_METHOD_REQUIRED);
    return fields.paymentMethodId || '';
  },

  // patch holds only whitelisted client fields; templateId is never part of it.
  edit: function (expense, patch, audit) {
    var edited = ExpenseTracking.Domain.Expense.create(Object.assign({}, expense, patch, { audit: audit }));
    // A set amount or payment method can be changed but never cleared back to empty.
    if (expense.amount !== null && edited.amount === null) throw DomainError.create(DomainError.CODE.EXPENSE_AMOUNT_REQUIRED);
    if (expense.paymentMethodId !== '' && edited.paymentMethodId === '') {
      throw DomainError.create(DomainError.CODE.EXPENSE_PAYMENT_METHOD_REQUIRED);
    }
    return edited;
  },

  // The expense a template contributes to a statement month; spent on the first day of that month.
  fromTemplate: function (template, statementMonth, identity) {
    return ExpenseTracking.Domain.Expense.create({
      id: identity.id,
      description: template.description,
      amount: template.amount,
      paymentMethodId: template.paymentMethodId,
      spentOn: ExpenseTracking.Domain.CalendarDate.firstDayOf(statementMonth),
      statementMonth: statementMonth,
      isFixed: true,
      templateId: template.id,
      audit: identity.audit
    });
  },

  // Newest spending first; ties broken by creation time.
  compareNewestFirst: function (a, b) {
    if (a.spentOn !== b.spentOn) return a.spentOn < b.spentOn ? 1 : -1;
    if (a.audit.created !== b.audit.created) return a.audit.created < b.audit.created ? 1 : -1;
    return 0;
  }
};
