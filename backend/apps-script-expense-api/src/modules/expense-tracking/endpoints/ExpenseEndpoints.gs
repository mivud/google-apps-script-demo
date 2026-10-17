// Expense actions. Handler input: { actor, payload }.
// template_id and the audit columns are server-owned and deliberately absent from FIELDS.
ExpenseTracking.Endpoints.ExpenseEndpoints = {
  ACTION: {
    LIST: 'expense-tracking.expense.list',
    CREATE: 'expense-tracking.expense.create',
    UPDATE: 'expense-tracking.expense.update',
    DELETE: 'expense-tracking.expense.delete',
    GENERATE_FIXED: 'expense-tracking.expense.generateFixed'
  },

  FIELDS: [
    { from: 'description', to: 'description', type: 'string' },
    { from: 'amount', to: 'amount', type: 'raw' },
    { from: 'payment_method_id', to: 'paymentMethodId', type: 'optionalReference' },
    { from: 'spent_on', to: 'spentOn', type: 'string' },
    { from: 'statement_month', to: 'statementMonth', type: 'string' },
    { from: 'is_fixed', to: 'isFixed', type: 'boolean' }
  ],

  readActions: function () {
    return [ExpenseTracking.Endpoints.ExpenseEndpoints.ACTION.LIST];
  },

  build: function (deps) {
    var endpoints = ExpenseTracking.Endpoints.ExpenseEndpoints;
    var mapper = ExpenseTracking.Endpoints.ExpenseTrackingJsonMapper;
    var application = ExpenseTracking.Application;
    var builder = EndpointBuilder.create(deps);
    builder.add(endpoints.ACTION.LIST, endpoints.readMonth, application.ListExpenses, mapper.list(mapper.expense));
    builder.add(endpoints.ACTION.CREATE, endpoints.readCreate, application.CreateExpense, mapper.expense);
    builder.add(endpoints.ACTION.UPDATE, endpoints.readUpdate, application.UpdateExpense, mapper.expense);
    builder.add(endpoints.ACTION.DELETE, endpoints.readId, application.DeleteExpense, function (result) { return result; });
    builder.add(endpoints.ACTION.GENERATE_FIXED, endpoints.readMonth, application.GenerateFixedExpenses, function (result) {
      return { items: result.items.map(mapper.expense), skipped: result.skipped };
    });
    return builder.handlers;
  },

  readMonth: function (input) {
    return { actor: input.actor, statementMonth: PayloadReader.requireString(input.payload, 'statement_month') };
  },

  readId: function (input) {
    return { id: PayloadReader.requireId(input.payload, 'id', ExpenseTracking.Application.ExpenseSupportService.LABEL) };
  },

  readCreate: function (input) {
    var endpoints = ExpenseTracking.Endpoints.ExpenseEndpoints;
    return { actor: input.actor, fields: PayloadReader.readFields(input.payload, endpoints.FIELDS) };
  },

  readUpdate: function (input) {
    var endpoints = ExpenseTracking.Endpoints.ExpenseEndpoints;
    return Object.assign(endpoints.readId(input), {
      actor: input.actor,
      patch: PayloadReader.readFields(input.payload, endpoints.FIELDS),
      expectedLastModified: PayloadReader.requireString(input.payload, 'expected_last_modified')
    });
  }
};
