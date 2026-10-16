// Cross-cutting actions that belong to no module. Action names are part of the public API.
var SystemEndpoints = {
  // Must equal "version" in ../package.json (a test checks it); beta number goes up once per release.
  API_VERSION: '1.0.0-beta.1',

  ACTION: {
    VERSION: 'system.version.get'
  },

  build: function () {
    var handlers = {};
    handlers[SystemEndpoints.ACTION.VERSION] = function () {
      return { version: SystemEndpoints.API_VERSION };
    };
    return handlers;
  },

  // Actions that never change data; the router runs them without the write lock.
  readActions: function () {
    return [SystemEndpoints.ACTION.VERSION];
  }
};
