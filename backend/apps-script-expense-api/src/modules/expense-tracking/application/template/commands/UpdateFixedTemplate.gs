// Use case: change a fixed expense template (optimistic concurrency; totalMonths cannot drop below monthsAdded).
// deps: { templates, paymentMethods, audit }. input: { actor, id, patch, expectedLastModified }.
ExpenseTracking.Application.UpdateFixedTemplate = {
  LABEL: 'Fixed expense template',

  execute: function (deps, input) {
    var template = deps.templates.findById(input.id);
    if (!template) throw DomainError.notFound(ExpenseTracking.Application.UpdateFixedTemplate.LABEL, input.id);
    ExpenseAuditStamper.assertUnchanged(template.audit, input.expectedLastModified);
    var updated = ExpenseTracking.Domain.FixedExpenseTemplate.edit(template, input.patch,
      deps.audit.modified(template.audit, input.actor));
    ExpenseTracking.Application.PaymentMethodSupportService.assertReferenceExists(deps.paymentMethods, updated.paymentMethodId);
    deps.templates.update(updated);
    return updated;
  }
};
