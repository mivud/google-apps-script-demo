// Use case: change a payment method (optimistic concurrency on last_modified).
// deps: { paymentMethods, audit }. input: { actor, id, patch, expectedLastModified }.
ExpenseTracking.Application.UpdatePaymentMethod = {
  execute: function (deps, input) {
    var support = ExpenseTracking.Application.PaymentMethodSupportService;
    var source = support.requireSource(deps, input.id);
    ExpenseAuditStamper.assertUnchanged(source.audit, input.expectedLastModified);
    var updated = ExpenseTracking.Domain.PaymentMethod.edit(source, input.patch, deps.audit.modified(source.audit, input.actor));
    support.assertNameFree(deps, updated.name, updated.id);
    deps.paymentMethods.update(updated);
    return updated;
  }
};
