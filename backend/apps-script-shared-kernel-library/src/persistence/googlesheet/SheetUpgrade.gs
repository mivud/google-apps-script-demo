// Brings a tab created by an older version to the current headers.
var SheetUpgrade = {
  MODIFIED_AT: 'modified_at',
  LEGACY_MODIFIED_AT: 'updated_at',
  CREATED_AT: 'created_at',
  HEADER_SEPARATOR: '|',

  run: function (sheet, headers) {
    var current = SheetUpgrade.currentHeaders(sheet);
    if (current.join(SheetUpgrade.HEADER_SEPARATOR) === headers.join(SheetUpgrade.HEADER_SEPARATOR)) return;
    var rows = SheetUpgrade.carryOverRows(sheet, current, headers);
    SheetUpgrade.rewrite(sheet, headers, rows, current.length);
  },

  currentHeaders: function (sheet) {
    var width = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(SheetLayout.HEADER_ROW, SheetLayout.FIRST_COLUMN, SheetLayout.SINGLE, width)
      .getValues()[0].map(String);
    while (headers.length && headers[headers.length - 1] === '') headers.pop();
    return headers;
  },

  carryOverRows: function (sheet, current, headers) {
    var lastRow = sheet.getLastRow();
    var old = lastRow > SheetLayout.HEADER_ROW
      ? sheet.getRange(SheetLayout.FIRST_DATA_ROW, SheetLayout.FIRST_COLUMN, lastRow - SheetLayout.HEADER_ROW, current.length).getValues()
      : [];
    return old.map(function (cells) {
      return headers.map(function (header) { return SheetUpgrade.carryOverCell(cells, current, header); });
    });
  },

  carryOverCell: function (cells, current, header) {
    var at = SheetUpgrade.sourceColumn(current, header);
    if (at === -1) return '';
    var value = cells[at];
    return value instanceof Date ? AuditRules.formatUtc(value) : value;
  },

  // modified_at falls back to the old updated_at, then to created_at.
  sourceColumn: function (current, header) {
    var at = current.indexOf(header);
    if (at !== -1 || header !== SheetUpgrade.MODIFIED_AT) return at;
    at = current.indexOf(SheetUpgrade.LEGACY_MODIFIED_AT);
    return at !== -1 ? at : current.indexOf(SheetUpgrade.CREATED_AT);
  },

  rewrite: function (sheet, headers, rows, previousWidth) {
    var width = Math.max(headers.length, previousWidth);
    if (sheet.getMaxColumns() < width) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
    // Clear the old layout first so renamed or dropped columns leave nothing behind.
    sheet.getRange(SheetLayout.HEADER_ROW, SheetLayout.FIRST_COLUMN, sheet.getMaxRows(), width).clearContent();
    sheet.getRange(SheetLayout.HEADER_ROW, SheetLayout.FIRST_COLUMN, sheet.getMaxRows(), headers.length)
      .setNumberFormat(SheetLayout.PLAIN_TEXT_FORMAT);
    sheet.getRange(SheetLayout.HEADER_ROW, SheetLayout.FIRST_COLUMN, SheetLayout.SINGLE, headers.length).setValues([headers]);
    if (rows.length) {
      sheet.getRange(SheetLayout.FIRST_DATA_ROW, SheetLayout.FIRST_COLUMN, rows.length, headers.length).setValues(rows);
    }
    sheet.setFrozenRows(SheetLayout.HEADER_ROW);
  }
};
