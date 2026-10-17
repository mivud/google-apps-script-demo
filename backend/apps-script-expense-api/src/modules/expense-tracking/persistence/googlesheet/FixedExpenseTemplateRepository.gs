// Sheet-backed repository of FixedExpenseTemplate aggregates (sheet `fixed_expense_templates`).
// total_months (blank = unlimited, so not a numeric column) and months_added sit before the audit columns; the installer adds them to older tabs with blank cells.
ExpenseTracking.Persistence.GoogleSheet.FixedExpenseTemplateRepository = {
  SCHEMA: {
    sheetName: 'fixed_expense_templates',
    headers: ['id', 'description', 'amount', 'payment_method_id', 'total_months', 'months_added', 'active'].concat(AuditColumns.HEADERS),
    numericColumns: ['months_added']
  },

  create: function (source, cache) {
    var gs = ExpenseTracking.Persistence.GoogleSheet;
    var table = EntityTable.create(source, cache, gs.FixedExpenseTemplateRepository.SCHEMA, gs.ExpenseTrackingRowMapper.template);
    return Object.assign(table, {
      isPaymentMethodReferenced: function (paymentMethodId) {
        return table.anyRow(function (row) { return String(row.payment_method_id).toLowerCase() === paymentMethodId; });
      }
    });
  }
};
