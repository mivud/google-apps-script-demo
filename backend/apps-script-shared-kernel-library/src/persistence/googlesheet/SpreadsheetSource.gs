// settings: { read(key) } over the app's Script Properties. SPREADSHEET_ID is optional when the app is bound to the sheet.
// Reads go through the Sheets advanced service when it is enabled (one request, no spreadsheet open),
// and fall back to SpreadsheetApp otherwise (bound scripts in tests, or the service switched off).
function SpreadsheetSource(settings) {
  this.settings = settings;
  this.spreadsheet = null;
  this.hasPendingWrites = false;
  this.sheetsApiFailed = false;
}

// Opened once per request: openById is slow and every table read would repeat it.
SpreadsheetSource.prototype.open = function () {
  if (!this.spreadsheet) {
    var id = this.settings.read(ScriptSettings.SPREADSHEET_ID_KEY);
    this.spreadsheet = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  }
  return this.spreadsheet;
};

// SpreadsheetApp buffers writes, but the Sheets API only sees flushed ones.
SpreadsheetSource.prototype.noteWrite = function () {
  this.hasPendingWrites = true;
};

SpreadsheetSource.prototype.readValues = function (schema) {
  if (typeof Sheets === 'undefined' || this.sheetsApiFailed) return this.readWithSpreadsheetApp(schema);
  if (this.hasPendingWrites) {
    SpreadsheetApp.flush();
    this.hasPendingWrites = false;
  }
  try {
    return this.readWithSheetsApi(schema);
  } catch (err) {
    // E.g. the Sheets API is not enabled yet for the app's Cloud project: keep serving through SpreadsheetApp.
    this.sheetsApiFailed = true;
    console.warn('Sheets API read failed, using SpreadsheetApp: ' + err.message);
    return this.readWithSpreadsheetApp(schema);
  }
};

SpreadsheetSource.prototype.readWithSheetsApi = function (schema) {
  var id = this.settings.read(ScriptSettings.SPREADSHEET_ID_KEY) || this.open().getId();
  var lastColumn = SpreadsheetSource.columnLetter(schema.headers.length);
  var range = "'" + schema.sheetName + "'!A" + SheetLayout.FIRST_DATA_ROW + ':' + lastColumn;
  var values = Sheets.Spreadsheets.Values.get(id, range).values || [];
  // The API drops trailing empty cells, so pad every row back to the schema width.
  return values.map(function (cells) {
    var padded = cells.slice();
    while (padded.length < schema.headers.length) padded.push('');
    return padded;
  });
};

SpreadsheetSource.prototype.readWithSpreadsheetApp = function (schema) {
  var sheet = this.open().getSheetByName(schema.sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < SheetLayout.FIRST_DATA_ROW) return [];
  var rowCount = lastRow - SheetLayout.HEADER_ROW;
  return sheet.getRange(SheetLayout.FIRST_DATA_ROW, SheetLayout.FIRST_COLUMN, rowCount, schema.headers.length).getValues();
};

// 1 -> A, 26 -> Z, 27 -> AA.
SpreadsheetSource.columnLetter = function (columnNumber) {
  var letters = '';
  for (var n = columnNumber; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
};
