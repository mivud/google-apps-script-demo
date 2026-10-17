// Namespace root of the expense-tracking module. Must load before every other file of the module.
// The functions below are the module's public surface; the composition root is the only caller.
var ExpenseTracking = {
  Domain: {},
  Application: {},
  Endpoints: {},
  Persistence: { GoogleSheet: {} },

  createRepositories: function (source, cache) {
    var sheet = ExpenseTracking.Persistence.GoogleSheet;
    return {
      paymentMethods: sheet.PaymentMethodRepository.create(source, cache),
      templates: sheet.FixedExpenseTemplateRepository.create(source, cache),
      expenses: sheet.ExpenseRepository.create(source, cache)
    };
  },

  // deps: { paymentMethod, template, expense }, each holding the ports of its feature (see Composition).
  createEndpoints: function (deps) {
    var endpoints = ExpenseTracking.Endpoints;
    return Object.assign({}, endpoints.PaymentMethodEndpoints.build(deps.paymentMethod),
      endpoints.FixedTemplateEndpoints.build(deps.template), endpoints.ExpenseEndpoints.build(deps.expense));
  },

  readActions: function () {
    var endpoints = ExpenseTracking.Endpoints;
    return [].concat(endpoints.PaymentMethodEndpoints.readActions(), endpoints.FixedTemplateEndpoints.readActions(),
      endpoints.ExpenseEndpoints.readActions());
  },

  // Order matters: referenced sheets first.
  schemaDefinitions: function () {
    var sheet = ExpenseTracking.Persistence.GoogleSheet;
    return [sheet.PaymentMethodRepository.SCHEMA, sheet.FixedExpenseTemplateRepository.SCHEMA, sheet.ExpenseRepository.SCHEMA]
      .map(function (schema) { return { schema: schema }; });
  }
};
