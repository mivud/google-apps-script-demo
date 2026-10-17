// Use case: create a fixed expense template (monthsAdded starts at 0).
// deps: { templates, paymentMethods, audit, ids }. input: { actor, fields }.
ExpenseTracking.Application.CreateFixedTemplate = {
  execute: function (deps, input) {
    var template = ExpenseTracking.Domain.FixedExpenseTemplate.create(Object.assign({}, input.fields, {
      id: deps.ids.newId(),
      audit: deps.audit.created(input.actor)
    }));
    ExpenseTracking.Application.PaymentMethodSupportService.assertReferenceExists(deps.paymentMethods, template.paymentMethodId);
    deps.templates.insert(template);
    return template;
  }
};
