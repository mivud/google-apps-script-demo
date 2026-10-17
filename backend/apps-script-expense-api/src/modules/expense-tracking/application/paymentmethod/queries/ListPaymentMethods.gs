// Use case: list payment methods by name. deps: { paymentMethods }.
ExpenseTracking.Application.ListPaymentMethods = {
  execute: function (deps) {
    var items = deps.paymentMethods.list().sort(function (a, b) {
      return String(a.name).toLowerCase() < String(b.name).toLowerCase() ? -1 : 1;
    });
    return { items: items };
  }
};
