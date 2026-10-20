// deps: { repository } (port).
DeviceManagement.Application.ListMaintenanceByEquipment = {
  execute: function (deps, input) {
    var equipmentId = IdRules.normalize(input.equipmentId);
    var rows = deps.repository.readAll()
      .filter(function (row) { return row.equipment_id === equipmentId; })
      .map(DeviceManagement.Domain.MaintenanceLog.fromStored);
    rows.sort(DeviceManagement.Domain.MaintenanceLog.compare);
    return rows;
  }
};
