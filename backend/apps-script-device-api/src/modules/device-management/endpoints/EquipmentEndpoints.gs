// Translates request payloads to use-case input. Action names are part of the public API.
DeviceManagement.Endpoints.EquipmentEndpoints = {
  ACTION: {
    LIST: 'device-management.equipment.list',
    GET: 'device-management.equipment.get',
    CREATE: 'device-management.equipment.create',
    UPDATE: 'device-management.equipment.update',
    REMOVE: 'device-management.equipment.remove'
  },

  // Actions that never change data; the router runs them without the write lock.
  readActions: function () {
    var action = DeviceManagement.Endpoints.EquipmentEndpoints.ACTION;
    return [action.LIST, action.GET];
  },

  build: function (deps) {
    var action = DeviceManagement.Endpoints.EquipmentEndpoints.ACTION;
    var app = DeviceManagement.Application;
    var handlers = {};
    handlers[action.LIST] = function (p) {
      return app.ListEquipment.execute(deps, {
        page: p.page, pageSize: p.pageSize, search: p.search, status: p.status, categoryIds: p.categoryIds
      });
    };
    handlers[action.GET] = function (p) { return app.GetEquipment.execute(deps, { id: p.id }); };
    handlers[action.CREATE] = function (p) {
      return app.CreateEquipment.execute(deps, DeviceManagement.Endpoints.EquipmentEndpoints.toDraft(p));
    };
    handlers[action.UPDATE] = function (p) { return app.UpdateEquipment.execute(deps, { id: p.id, patch: p.patch }); };
    handlers[action.REMOVE] = function (p) { return app.RemoveEquipment.execute(deps, { id: p.id }); };
    return handlers;
  },

  // Copies only whitelisted fields so clients can never set id or audit columns.
  toDraft: function (p) {
    return {
      categoryId: p.category_id,
      name: p.name,
      description: p.description,
      status: p.status,
      quantity: p.quantity,
      purchaseDate: p.purchase_date,
      warrantyMonths: p.warranty_months,
      note: p.note,
      vendor: p.vendor
    };
  }
};
