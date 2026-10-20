// Entity (aggregate root): a recurring expense that generates one expense per statement month, totalMonths times (null = unlimited).
// amount and paymentMethodId ('' = none) are optional; generated expenses then start without them.
// Shape: { id, description, amount, paymentMethodId, totalMonths, paymentDay (1..31 or null), monthsAdded, active, audit }.
// monthsAdded is server-owned: it starts at 0 and only recordGenerated changes it.
ExpenseTracking.Domain.FixedExpenseTemplate = {
  create: function (fields) {
    var domain = ExpenseTracking.Domain;
    return {
      id: fields.id,
      description: domain.ExpenseDescription.normalize(fields.description),
      amount: domain.MoneyAmount.parseOptional(fields.amount),
      paymentMethodId: fields.paymentMethodId || '',
      totalMonths: domain.TotalMonths.parse(fields.totalMonths),
      paymentDay: domain.PaymentDay.parse(fields.paymentDay),
      monthsAdded: 0,
      active: fields.active !== false,
      audit: fields.audit
    };
  },

  // patch never carries monthsAdded: the endpoint only reads whitelisted fields.
  edit: function (template, patch, audit) {
    var entity = ExpenseTracking.Domain.FixedExpenseTemplate;
    var edited = entity.create(Object.assign({}, template, patch, { audit: audit }));
    if (edited.totalMonths !== null && edited.totalMonths < template.monthsAdded) throw DomainError.create(DomainError.CODE.TOTAL_MONTHS_BELOW_ADDED);
    edited.monthsAdded = template.monthsAdded;
    return edited;
  },

  canGenerate: function (template) {
    return template.active && (template.totalMonths === null || template.monthsAdded < template.totalMonths);
  },

  recordGenerated: function (template, audit) {
    return Object.assign({}, template, { monthsAdded: template.monthsAdded + 1, audit: audit });
  },

  // Description of the expense a template just generated; pass the template AFTER recordGenerated.
  // Limited templates get " [n/total]"; the base text is cut so the result still fits ExpenseDescription.
  describeInstallment: function (template) {
    if (template.totalMonths === null) return template.description;
    var suffix = ' [' + template.monthsAdded + '/' + template.totalMonths + ']';
    var room = ExpenseTracking.Domain.ExpenseDescription.MAX_LENGTH - suffix.length;
    return template.description.slice(0, Math.max(room, 0)).trim() + suffix;
  }
};
