// Row <-> entity mapping stays here: sheet columns (snake_case, TRUE/FALSE text) are persistence details.
ExpenseTracking.Persistence.GoogleSheet.ExpenseTrackingRowMapper = {
  // Optional counts are blank cells when unset (and 0 or text is treated as unset when read).
  optionalCount: function (cell) {
    var count = String(cell).trim() === '' ? NaN : Number(cell);
    return count >= 1 ? count : null;
  },

  // A blank cell is null; a positive integer is itself; anything else is invalid data (NaN).
  parseAmountCell: function (cell) {
    if (String(cell).trim() === '') return null;
    var amount = Number(cell);
    return Number.isInteger(amount) && amount > 0 ? amount : NaN;
  },

  // An unusable template amount reads as "no amount" rather than hiding the template.
  templateAmount: function (cell) {
    var amount = ExpenseTracking.Persistence.GoogleSheet.ExpenseTrackingRowMapper.parseAmountCell(cell);
    return Number.isNaN(amount) ? null : amount;
  },

  paymentMethod: {
    toEntity: function (row) {
      return {
        id: String(row.id).toLowerCase(),
        name: row.name,
        active: SheetFlag.parse(row.active),
        statementClosingDay: ExpenseTracking.Persistence.GoogleSheet.ExpenseTrackingRowMapper.optionalCount(row.statement_closing_day),
        color: String(row.color).trim() === '' ? null : String(row.color),
        audit: AuditColumns.fromRow(row)
      };
    },
    toRow: function (method) {
      return Object.assign({
        id: method.id,
        name: method.name,
        active: SheetFlag.format(method.active),
        statement_closing_day: method.statementClosingDay === null ? '' : method.statementClosingDay,
        color: method.color === null ? '' : method.color
      }, AuditColumns.toRow(method.audit));
    }
  },

  template: {
    toEntity: function (row) {
      return {
        id: String(row.id).toLowerCase(),
        description: row.description,
        amount: ExpenseTracking.Persistence.GoogleSheet.ExpenseTrackingRowMapper.templateAmount(row.amount),
        paymentMethodId: String(row.payment_method_id).toLowerCase(),
        totalMonths: ExpenseTracking.Persistence.GoogleSheet.ExpenseTrackingRowMapper.optionalCount(row.total_months),
        monthsAdded: row.months_added,
        active: SheetFlag.parse(row.active),
        audit: AuditColumns.fromRow(row)
      };
    },
    toRow: function (template) {
      return Object.assign({
        id: template.id,
        description: template.description,
        amount: template.amount === null ? '' : template.amount,
        payment_method_id: template.paymentMethodId,
        total_months: template.totalMonths === null ? '' : template.totalMonths,
        months_added: template.monthsAdded,
        active: SheetFlag.format(template.active)
      }, AuditColumns.toRow(template.audit));
    }
  },

  expense: {
    // Returns null (row skipped) for invalid data: a bad amount, or an empty amount or payment method on a manual expense.
    toEntity: function (row) {
      var mapper = ExpenseTracking.Persistence.GoogleSheet.ExpenseTrackingRowMapper;
      var amount = mapper.parseAmountCell(row.amount);
      var templateId = String(row.template_id).toLowerCase();
      var paymentMethodId = String(row.payment_method_id).toLowerCase();
      if (Number.isNaN(amount) || ((amount === null || paymentMethodId === '') && templateId === '')) return null;
      return {
        id: String(row.id).toLowerCase(),
        description: row.description,
        amount: amount,
        paymentMethodId: paymentMethodId,
        spentOn: row.spent_on,
        statementMonth: row.statement_month,
        isFixed: SheetFlag.parse(row.is_fixed),
        templateId: templateId,
        audit: AuditColumns.fromRow(row)
      };
    },
    toRow: function (expense) {
      return Object.assign({
        id: expense.id,
        description: expense.description,
        amount: expense.amount === null ? '' : expense.amount,
        payment_method_id: expense.paymentMethodId,
        spent_on: expense.spentOn,
        statement_month: expense.statementMonth,
        is_fixed: SheetFlag.format(expense.isFixed),
        template_id: expense.templateId
      }, AuditColumns.toRow(expense.audit));
    }
  }
};
