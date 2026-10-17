// Translates request payloads to use-case input. Action names are part of the public API.
DeviceManagement.Endpoints.MaintenanceLogEndpoints = {
  ACTION: {
    LIST_BY_EQUIPMENT: 'device-management.maintenance.listByEquipment',
    ADD: 'device-management.maintenance.add'
  },

  // Actions that never change data; the router runs them without the write lock.
  readActions: function () {
    var action = DeviceManagement.Endpoints.MaintenanceLogEndpoints.ACTION;
    return [action.LIST_BY_EQUIPMENT];
  },

  build: function (deps) {
    var action = DeviceManagement.Endpoints.MaintenanceLogEndpoints.ACTION;
    var app = DeviceManagement.Application;
    var handlers = {};
    handlers[action.LIST_BY_EQUIPMENT] = function (p) {
      return app.ListMaintenanceByEquipment.execute(deps, { equipmentId: p.equipmentId });
    };
    // The add payload is a snake_case row, same shape as the other actions.
    handlers[action.ADD] = function (p) {
      return app.AddMaintenanceLog.execute(deps, {
        equipmentId: p.equipment_id, type: p.type, performedAt: p.performed_at, note: p.note
      });
    };
    return handlers;
  }
};
