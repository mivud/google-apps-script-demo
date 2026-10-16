// SPREADSHEET_ID is optional when the script is bound to the sheet.
function SpreadsheetSource() {}

SpreadsheetSource.prototype.open = function () {
  var id = ScriptSettings.read(ScriptSettings.SPREADSHEET_ID_KEY);
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
};
