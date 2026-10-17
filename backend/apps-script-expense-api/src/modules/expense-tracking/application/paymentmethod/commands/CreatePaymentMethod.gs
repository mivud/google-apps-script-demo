// Use case: create a payment method with a client-chosen id. The caller holds the write lock, so the duplicate
// checks and the insert are one critical section. deps: { paymentMethods, audit }. input: { actor, fields: { id, name, active } }.
ExpenseTracking.Application.CreatePaymentMethod = {
  execute: function (deps, input) {
    var support = ExpenseTracking.Application.PaymentMethodSupportService;
    var method = ExpenseTracking.Domain.PaymentMethod.create(Object.assign({}, input.fields, {
      audit: deps.audit.created(input.actor)
    }));
    support.assertIdFree(deps, method.id);
    support.assertNameFree(deps, method.name, method.id);
    deps.paymentMethods.insert(method);
    return method;
  }
};
