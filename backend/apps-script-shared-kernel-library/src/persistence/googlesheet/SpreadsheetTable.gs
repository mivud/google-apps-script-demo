// Generic TableGateway over one sheet. schema: { sheetName, headers, numericColumns }.
// cache (optional port): { get(name), put(name, rows), remove(name) } holding parsed rows for readAll.
function SpreadsheetTable(source, schema, cache) {
  this.source = source;
  this.schema = schema;
  this.cache = cache || null;
}

SpreadsheetTable.prototype.sheet = function () {
  return this.source.open().getSheetByName(this.schema.sheetName);
};

SpreadsheetTable.prototype.readCells = function () {
  return this.source.readValues(this.schema);
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

// Always hits the sheet; write paths use it because they delete by row position.
SpreadsheetTable.prototype.loadRows = function () {
  return this.readCells().map(this.toRow, this);
};

// May serve rows up to the cache TTL old; every write through this class clears the entry.
SpreadsheetTable.prototype.readAll = function () {
  if (!this.cache) return this.loadRows();
  var cached = this.cache.get(this.schema.sheetName);
  if (cached) return cached;
  var rows = this.loadRows();
  this.cache.put(this.schema.sheetName, rows);
  return rows;
};

// Called after every write: drops cached rows and tells the source a flush is needed before the next API read.
SpreadsheetTable.prototype.invalidate = function () {
  this.source.noteWrite();
  if (this.cache) this.cache.remove(this.schema.sheetName);
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
  this.invalidate();
};

SpreadsheetTable.prototype.deleteAt = function (index) {
  this.sheet().deleteRow(index);
  this.invalidate();
};

SpreadsheetTable.prototype.deleteWhere = function (predicate) {
  var sheet = this.sheet();
  var rows = this.loadRows();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (predicate(rows[i])) sheet.deleteRow(i + SheetLayout.FIRST_DATA_ROW);
  }
  this.invalidate();
};
