// Converts the old free-text equipment.category column into root categories + category_id.
// Categories are written first and reused by name, so a rerun after a partial failure is safe.
DeviceManagement.Persistence.GoogleSheet.EquipmentLegacyMigrationService = {
  LEGACY_COLUMN: 'category',
  NEW_COLUMN: 'category_id',

  // createRootResolver: factory of the RootCategoryResolver port, called only when a migration is needed.
  create: function (createRootResolver) {
    return function (sheet) { DeviceManagement.Persistence.GoogleSheet.EquipmentLegacyMigrationService.run(sheet, createRootResolver); };
  },

  run: function (sheet, createRootResolver) {
    var column = DeviceManagement.Persistence.GoogleSheet.EquipmentLegacyMigrationService.findLegacyColumn(sheet);
    if (!column) return;
    var names = DeviceManagement.Persistence.GoogleSheet.EquipmentLegacyMigrationService.readNames(sheet, column);
    var resolver = createRootResolver();
    var ids = names.map(function (cells) { return [resolver.idForName(cells[0])]; });
    if (ids.length) {
      sheet.getRange(SheetLayout.FIRST_DATA_ROW, column, ids.length, SheetLayout.SINGLE)
        .setNumberFormat(SheetLayout.PLAIN_TEXT_FORMAT)
        .setValues(ids);
    }
    sheet.getRange(SheetLayout.HEADER_ROW, column).setValue(DeviceManagement.Persistence.GoogleSheet.EquipmentLegacyMigrationService.NEW_COLUMN);
  },

  // Returns the 1-based sheet column of the legacy header, or 0 when no migration is needed.
  findLegacyColumn: function (sheet) {
    var width = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(SheetLayout.HEADER_ROW, SheetLayout.FIRST_COLUMN, SheetLayout.SINGLE, width)
      .getValues()[0].map(String);
    var index = headers.indexOf(DeviceManagement.Persistence.GoogleSheet.EquipmentLegacyMigrationService.LEGACY_COLUMN);
    var alreadyMigrated = headers.indexOf(DeviceManagement.Persistence.GoogleSheet.EquipmentLegacyMigrationService.NEW_COLUMN) !== -1;
    return index === -1 || alreadyMigrated ? 0 : index + 1;
  },

  readNames: function (sheet, column) {
    var lastRow = sheet.getLastRow();
    if (lastRow <= SheetLayout.HEADER_ROW) return [];
    return sheet.getRange(SheetLayout.FIRST_DATA_ROW, column, lastRow - SheetLayout.HEADER_ROW, SheetLayout.SINGLE).getValues();
  }
};
