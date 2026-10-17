// Sheet-backed repository of PaymentMethod aggregates (sheet `payment_methods`).
ExpenseTracking.Persistence.GoogleSheet.PaymentMethodRepository = {
  SCHEMA: {
    sheetName: 'payment_methods',
    headers: ['id', 'name', 'active', 'statement_closing_day', 'color'].concat(AuditColumns.HEADERS),
    numericColumns: []
  },

  create: function (source, cache) {
    var gs = ExpenseTracking.Persistence.GoogleSheet;
    var table = EntityTable.create(source, cache, gs.PaymentMethodRepository.SCHEMA, gs.ExpenseTrackingRowMapper.paymentMethod);
    return Object.assign(table, {
      findByName: function (name) {
        return table.list().filter(function (item) { return ExpenseTracking.Domain.PaymentMethodName.same(item.name, name); })[0] || null;
      }
    });
  }
};
