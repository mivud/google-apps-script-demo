// Rules shared by the payment method use cases and by features that reference a payment method. deps: { paymentMethods }.
ExpenseTracking.Application.PaymentMethodSupportService = {
  LABEL: 'Payment method',

  requireSource: function (deps, id) {
    var source = deps.paymentMethods.findById(id);
    if (!source) throw DomainError.notFound(ExpenseTracking.Application.PaymentMethodSupportService.LABEL, id);
    return source;
  },

  // Ids are compared ignoring case, also against rows typed by hand in the sheet.
  assertIdFree: function (deps, id) {
    if (deps.paymentMethods.findById(id)) throw DomainError.create(DomainError.CODE.PAYMENT_METHOD_ID_TAKEN);
  },

  assertNameFree: function (deps, name, ownId) {
    var other = deps.paymentMethods.findByName(name);
    if (other && other.id !== ownId) throw DomainError.create(DomainError.CODE.PAYMENT_METHOD_NAME_TAKEN);
  },

  // An expense or template may only point at a payment method that exists. Returns it.
  requireReference: function (paymentMethods, id) {
    var method = paymentMethods.findById(id);
    if (!method) throw DomainError.create(DomainError.CODE.PAYMENT_METHOD_NOT_FOUND);
    return method;
  },

  // '' means "no payment method" (allowed on template-based rows) and is not looked up.
  assertReferenceExists: function (paymentMethods, id) {
    if (id === '') return;
    ExpenseTracking.Application.PaymentMethodSupportService.requireReference(paymentMethods, id);
  }
};
