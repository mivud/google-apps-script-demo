// Renames the pre-rename tab and columns (money_sources / money_source_id) by name, keeping their data.
// Does nothing on a fresh spreadsheet. Call under the script lock, before the schema installer runs.
ExpenseTracking.Persistence.GoogleSheet.LegacyNamesMigration = {
  OLD_TAB: 'money_sources',
  NEW_TAB: 'payment_methods',
  OLD_COLUMN: 'money_source_id',
  NEW_COLUMN: 'payment_method_id',
  COLUMN_TABS: ['fixed_expense_templates', 'expenses'],
  HEADER_ROW: 1,

  run: function (spreadsheet) {
    var migration = ExpenseTracking.Persistence.GoogleSheet.LegacyNamesMigration;
    var oldTab = spreadsheet.getSheetByName(migration.OLD_TAB);
    if (oldTab && !spreadsheet.getSheetByName(migration.NEW_TAB)) oldTab.setName(migration.NEW_TAB);
    migration.COLUMN_TABS.forEach(function (name) {
      var sheet = spreadsheet.getSheetByName(name);
      if (sheet) migration.renameColumn(sheet);
    });
  },

  renameColumn: function (sheet) {
    var migration = ExpenseTracking.Persistence.GoogleSheet.LegacyNamesMigration;
    var width = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(migration.HEADER_ROW, 1, 1, width).getValues()[0];
    var at = headers.indexOf(migration.OLD_COLUMN);
    if (at !== -1) sheet.getRange(migration.HEADER_ROW, at + 1).setValue(migration.NEW_COLUMN);
  }
};
