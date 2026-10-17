// Payment method actions. Action names are part of the public API. Handler input: { actor, payload }.
ExpenseTracking.Endpoints.PaymentMethodEndpoints = {
  ACTION: {
    LIST: 'expense-tracking.paymentMethod.list',
    CREATE: 'expense-tracking.paymentMethod.create',
    UPDATE: 'expense-tracking.paymentMethod.update',
    DELETE: 'expense-tracking.paymentMethod.delete'
  },

  FIELDS: [{ from: 'name', to: 'name', type: 'string' }, { from: 'active', to: 'active', type: 'boolean' },
    { from: 'statement_closing_day', to: 'statementClosingDay', type: 'raw' },
    { from: 'color', to: 'color', type: 'raw' }],
  // Only create accepts an id; update never reads one into the patch, so the id stays immutable.
  CREATE_FIELDS: [{ from: 'id', to: 'id', type: 'string' }],

  readActions: function () {
    return [ExpenseTracking.Endpoints.PaymentMethodEndpoints.ACTION.LIST];
  },

  build: function (deps) {
    var endpoints = ExpenseTracking.Endpoints.PaymentMethodEndpoints;
    var mapper = ExpenseTracking.Endpoints.ExpenseTrackingJsonMapper;
    var application = ExpenseTracking.Application;
    var builder = EndpointBuilder.create(deps);
    builder.add(endpoints.ACTION.LIST, function () { return {}; }, application.ListPaymentMethods, mapper.list(mapper.paymentMethod));
    builder.add(endpoints.ACTION.CREATE, endpoints.readCreate, application.CreatePaymentMethod, mapper.paymentMethod);
    builder.add(endpoints.ACTION.UPDATE, endpoints.readUpdate, application.UpdatePaymentMethod, mapper.paymentMethod);
    builder.add(endpoints.ACTION.DELETE, endpoints.readId, application.DeletePaymentMethod, function (result) { return result; });
    return builder.handlers;
  },

  readId: function (input) {
    return { id: PayloadReader.requireId(input.payload, 'id', ExpenseTracking.Application.PaymentMethodSupportService.LABEL) };
  },

  readCreate: function (input) {
    var endpoints = ExpenseTracking.Endpoints.PaymentMethodEndpoints;
    return { actor: input.actor, fields: PayloadReader.readFields(input.payload, endpoints.CREATE_FIELDS.concat(endpoints.FIELDS)) };
  },

  readUpdate: function (input) {
    var endpoints = ExpenseTracking.Endpoints.PaymentMethodEndpoints;
    return Object.assign(endpoints.readId(input), {
      actor: input.actor,
      patch: PayloadReader.readFields(input.payload, endpoints.FIELDS),
      expectedLastModified: PayloadReader.requireString(input.payload, 'expected_last_modified')
    });
  }
};
