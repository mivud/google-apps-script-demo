// Sheet-backed repository of Expense aggregates (sheet `expenses`).
ExpenseTracking.Persistence.GoogleSheet.ExpenseRepository = {
  SCHEMA: {
    sheetName: 'expenses',
    headers: ['id', 'description', 'amount', 'payment_method_id', 'spent_on', 'statement_month', 'is_fixed', 'template_id']
      .concat(AuditColumns.HEADERS),
    numericColumns: []
  },

  create: function (source, cache) {
    var gs = ExpenseTracking.Persistence.GoogleSheet;
    var table = EntityTable.create(source, cache, gs.ExpenseRepository.SCHEMA, gs.ExpenseTrackingRowMapper.expense);
    return Object.assign(table, {
      listByStatementMonth: function (statementMonth) {
        return table.list().filter(function (expense) { return expense.statementMonth === statementMonth; });
      },
      isPaymentMethodReferenced: function (paymentMethodId) {
        return table.anyRow(function (row) { return String(row.payment_method_id).toLowerCase() === paymentMethodId; });
      }
    });
  }
};
