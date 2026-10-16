// Generic TableGateway over one sheet. schema: { sheetName, headers, numericColumns }.
function SpreadsheetTable(source, schema) {
  this.source = source;
  this.schema = schema;
}

SpreadsheetTable.prototype.sheet = function () {
  return this.source.open().getSheetByName(this.schema.sheetName);
};

SpreadsheetTable.prototype.readCells = function () {
  var sheet = this.sheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < SheetLayout.FIRST_DATA_ROW) return [];
  var rowCount = lastRow - SheetLayout.HEADER_ROW;
  return sheet.getRange(SheetLayout.FIRST_DATA_ROW, SheetLayout.FIRST_COLUMN, rowCount, this.schema.headers.length).getValues();
};

SpreadsheetTable.prototype.toRow = function (cells) {
  var numericColumns = this.schema.numericColumns;
  var row = {};
  this.schema.headers.forEach(function (header, i) {
    var value = cells[i];
    if (value instanceof Date) value = AuditRules.formatUtc(value);
    row[header] = numericColumns.indexOf(header) !== -1 ? Number(value) : String(value);
  });
  return row;
};

SpreadsheetTable.prototype.readAll = function () {
  return this.readCells().map(this.toRow, this);
};

SpreadsheetTable.prototype.findById = function (id) {
  var wanted = IdRules.normalize(id);
  if (!wanted) return null;
  var cells = this.readCells();
  for (var i = 0; i < cells.length; i++) {
    if (String(cells[i][0]).toLowerCase() === wanted) {
      return { index: i + SheetLayout.FIRST_DATA_ROW, row: this.toRow(cells[i]) };
    }
  }
  return null;
};

SpreadsheetTable.prototype.append = function (row) {
  var sheet = this.sheet();
  var target = sheet.getLastRow() + 1;
  // Grow the grid first; writing past getMaxRows() would throw.
  if (target > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), target - sheet.getMaxRows());
  this.update(target, row);
};

SpreadsheetTable.prototype.update = function (index, row) {
  var headers = this.schema.headers;
  var cells = headers.map(function (header) { return row[header]; });
  // Re-apply plain text so rows added later keep ISO dates and ids intact.
  this.sheet()
    .getRange(index, SheetLayout.FIRST_COLUMN, SheetLayout.SINGLE, headers.length)
    .setNumberFormat(SheetLayout.PLAIN_TEXT_FORMAT)
    .setValues([cells]);
};

SpreadsheetTable.prototype.deleteAt = function (index) {
  this.sheet().deleteRow(index);
};

SpreadsheetTable.prototype.deleteWhere = function (predicate) {
  var sheet = this.sheet();
  var rows = this.readAll();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (predicate(rows[i])) sheet.deleteRow(i + SheetLayout.FIRST_DATA_ROW);
  }
};
