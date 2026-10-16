// Creates missing tabs and upgrades old ones.
// definitions: ordered [{ schema, beforeUpgrade?(sheet) }]; order matters when a migration writes into an earlier tab.
function SheetInstaller(source, definitions) {
  this.source = source;
  this.definitions = definitions;
}

SheetInstaller.prototype.ensureSchema = function () {
  var spreadsheet = this.source.open();
  this.definitions.forEach(function (definition) {
    SheetInstaller.ensureSheet(spreadsheet, definition);
  });
};

SheetInstaller.ensureSheet = function (spreadsheet, definition) {
  var sheet = spreadsheet.getSheetByName(definition.schema.sheetName);
  if (!sheet) {
    SheetInstaller.createSheet(spreadsheet, definition.schema);
    return;
  }
  if (definition.beforeUpgrade) definition.beforeUpgrade(sheet);
  SheetUpgrade.run(sheet, definition.schema.headers);
};

SheetInstaller.createSheet = function (spreadsheet, schema) {
  var width = schema.headers.length;
  var sheet = spreadsheet.insertSheet(schema.sheetName);
  sheet.getRange(SheetLayout.HEADER_ROW, SheetLayout.FIRST_COLUMN, SheetLayout.SINGLE, width).setValues([schema.headers]);
  sheet.setFrozenRows(SheetLayout.HEADER_ROW);
  sheet.getRange(SheetLayout.FIRST_DATA_ROW, SheetLayout.FIRST_COLUMN, sheet.getMaxRows() - SheetLayout.HEADER_ROW, width)
    .setNumberFormat(SheetLayout.PLAIN_TEXT_FORMAT);
};
