// Sheet-backed implementations of the maintenance ports.
DeviceManagement.Persistence.GoogleSheet.MaintenanceLogService = {
  SCHEMA: {
    sheetName: 'maintenance_logs',
    headers: ['id', 'equipment_id', 'type', 'performed_at', 'note',
      'created_at', 'modified_at', 'created_by', 'last_modified_by'],
    numericColumns: []
  },

  createRepository: function (source) {
    return new SpreadsheetTable(source, DeviceManagement.Persistence.GoogleSheet.MaintenanceLogService.SCHEMA);
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
