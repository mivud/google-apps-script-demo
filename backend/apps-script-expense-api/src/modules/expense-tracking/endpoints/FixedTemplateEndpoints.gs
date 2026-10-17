// Fixed expense template actions. Handler input: { actor, payload }.
// months_added is server-owned and is deliberately absent from FIELDS, so a client can never send it.
ExpenseTracking.Endpoints.FixedTemplateEndpoints = {
  ACTION: {
    LIST: 'expense-tracking.fixedTemplate.list',
    CREATE: 'expense-tracking.fixedTemplate.create',
    UPDATE: 'expense-tracking.fixedTemplate.update',
    DELETE: 'expense-tracking.fixedTemplate.delete'
  },

  FIELDS: [
    { from: 'description', to: 'description', type: 'string' },
    { from: 'amount', to: 'amount', type: 'raw' },
    { from: 'payment_method_id', to: 'paymentMethodId', type: 'optionalReference' },
    { from: 'total_months', to: 'totalMonths', type: 'raw' },
    { from: 'active', to: 'active', type: 'boolean' }
  ],

  readActions: function () {
    return [ExpenseTracking.Endpoints.FixedTemplateEndpoints.ACTION.LIST];
  },

  build: function (deps) {
    var endpoints = ExpenseTracking.Endpoints.FixedTemplateEndpoints;
    var mapper = ExpenseTracking.Endpoints.ExpenseTrackingJsonMapper;
    var application = ExpenseTracking.Application;
    var builder = EndpointBuilder.create(deps);
    builder.add(endpoints.ACTION.LIST, function () { return {}; }, application.ListFixedTemplates, mapper.list(mapper.template));
    builder.add(endpoints.ACTION.CREATE, endpoints.readCreate, application.CreateFixedTemplate, mapper.template);
    builder.add(endpoints.ACTION.UPDATE, endpoints.readUpdate, application.UpdateFixedTemplate, mapper.template);
    builder.add(endpoints.ACTION.DELETE, endpoints.readId, application.DeleteFixedTemplate, function (result) { return result; });
    return builder.handlers;
  },

  readId: function (input) {
    return { id: PayloadReader.requireId(input.payload, 'id', ExpenseTracking.Application.UpdateFixedTemplate.LABEL) };
  },

  readCreate: function (input) {
    var endpoints = ExpenseTracking.Endpoints.FixedTemplateEndpoints;
    return { actor: input.actor, fields: PayloadReader.readFields(input.payload, endpoints.FIELDS) };
  },

  readUpdate: function (input) {
    var endpoints = ExpenseTracking.Endpoints.FixedTemplateEndpoints;
    return Object.assign(endpoints.readId(input), {
      actor: input.actor,
      patch: PayloadReader.readFields(input.payload, endpoints.FIELDS),
      expectedLastModified: PayloadReader.requireString(input.payload, 'expected_last_modified')
    });
  }
};
