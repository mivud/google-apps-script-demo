// Translates request payloads to use-case input. Action names are part of the public API.
DeviceManagement.Endpoints.CategoryEndpoints = {
  ACTION: {
    LIST: 'device-management.category.list',
    GET: 'device-management.category.get',
    CREATE: 'device-management.category.create',
    UPDATE: 'device-management.category.update',
    REMOVE: 'device-management.category.remove'
  },

  // Actions that never change data; the router runs them without the write lock.
  readActions: function () {
    var action = DeviceManagement.Endpoints.CategoryEndpoints.ACTION;
    return [action.LIST, action.GET];
  },

  build: function (deps) {
    var action = DeviceManagement.Endpoints.CategoryEndpoints.ACTION;
    var app = DeviceManagement.Application;
    var handlers = {};
    handlers[action.LIST] = function () { return app.ListCategories.execute(deps); };
    handlers[action.GET] = function (p) { return app.GetCategory.execute(deps, { id: p.id }); };
    handlers[action.CREATE] = function (p) {
      return app.CreateCategory.execute(deps, { parentId: p.parent_id, name: p.name });
    };
    handlers[action.UPDATE] = function (p) {
      return app.UpdateCategory.execute(deps, { id: p.id, patch: p.patch });
    };
    handlers[action.REMOVE] = function (p) { return app.RemoveCategory.execute(deps, { id: p.id }); };
    return handlers;
  }
};
