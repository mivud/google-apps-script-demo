// Creates missing tabs and upgrades old ones.
// definitions: ordered [{ schema, beforeUpgrade?(sheet) }]; order matters when a migration writes into an earlier tab.
// state: { settings: { read(key), write(key, value) }, rowCache?: { remove(name) } }.
// The applied schema signature is remembered, so requests skip the sheet checks until the headers change.
function SheetInstaller(source, definitions, state) {
  this.source = source;
  this.definitions = definitions;
  this.settings = state.settings;
  this.rowCache = state.rowCache || null;
}

SheetInstaller.prototype.signature = function () {
  return this.definitions.map(function (definition) {
    return definition.schema.sheetName + ':' + definition.schema.headers.join(',');
  }).join(';');
};

SheetInstaller.prototype.isCurrent = function () {
  return this.settings.read(ScriptSettings.SCHEMA_SIGNATURE_KEY) === this.signature();
};

// Call under the script lock. The signature is stored last, so a failed run is retried.
SheetInstaller.prototype.ensureSchema = function () {
  if (this.isCurrent()) return;
  var spreadsheet = this.source.open();
  this.definitions.forEach(function (definition) {
    SheetInstaller.ensureSheet(spreadsheet, definition);
  });
  this.source.noteWrite();
  this.clearRowCache();
  this.settings.write(ScriptSettings.SCHEMA_SIGNATURE_KEY, this.signature());
};

// An upgrade rewrites whole tabs, so cached rows may no longer match.
SheetInstaller.prototype.clearRowCache = function () {
  if (!this.rowCache) return;
  var cache = this.rowCache;
  this.definitions.forEach(function (definition) { cache.remove(definition.schema.sheetName); });
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
