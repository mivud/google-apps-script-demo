// Use case: delete a payment method unless an expense or template still references it.
// deps: { paymentMethods, usage ({ isPaymentMethodUsed(id) }) }. input: { id }.
ExpenseTracking.Application.DeletePaymentMethod = {
  execute: function (deps, input) {
    var source = ExpenseTracking.Application.PaymentMethodSupportService.requireSource(deps, input.id);
    if (deps.usage.isPaymentMethodUsed(source.id)) throw DomainError.create(DomainError.CODE.PAYMENT_METHOD_IN_USE);
    deps.paymentMethods.delete(source.id);
    return {};
  }
};
