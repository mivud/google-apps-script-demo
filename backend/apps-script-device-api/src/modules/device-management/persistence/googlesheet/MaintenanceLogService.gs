// Sheet-backed implementations of the maintenance ports.
DeviceManagement.Persistence.GoogleSheet.MaintenanceLogService = {
  SCHEMA: {
    sheetName: 'maintenance_logs',
    headers: ['id', 'equipment_id', 'type', 'performed_at', 'note', 'vendor',
      'created_at', 'modified_at', 'created_by', 'last_modified_by'],
    numericColumns: []
  },

  createRepository: function (source, cache) {
    return new SpreadsheetTable(source, DeviceManagement.Persistence.GoogleSheet.MaintenanceLogService.SCHEMA, cache);
  },

  // MaintenanceLogCascade port, provided to the equipment module (mirrors ON DELETE CASCADE).
  createLogCascade: function (repository) {
    return {
      removeAllFor: function (equipmentId) {
        repository.deleteWhere(function (row) { return row.equipment_id === equipmentId; });
      }
    };
  }
};
