// Composition root: the only place that knows every module and wires implementations to ports.
// Everything is built inside functions at request time, so file load order never matters.
var Composition = {
  createApp: function () {
    var core = Composition.createCore();
    var repositories = Composition.createRepositories(core.source, core.rowCache);
    var ports = Composition.createCrossModulePorts(repositories);
    var deps = Composition.createModuleDeps(core, repositories, ports);
    var readActions = [].concat(DeviceManagement.readActions(), SystemEndpoints.readActions());
    return {
      accessResolver: core.accessResolver,
      currentUser: core.currentUser,
      lockGuard: core.lockGuard,
      router: new Router(Composition.createEndpointRegistry(deps), readActions),
      schemaInstaller: new SheetInstaller(core.source, Composition.createSchemaDefinitions(deps), {
        settings: core.settings,
        rowCache: core.rowCache
      })
    };
  },

  createCore: function () {
    var clock = new SystemClock();
    var currentUser = new RequestCurrentUser();
    var cacheStore = CacheService.getScriptCache();
    // Host services are handed to the library: its own PropertiesService/CacheService/LockService/UrlFetchApp scopes differ.
    var settings = ScriptSettings.fromProperties(PropertiesService.getScriptProperties());
    return {
      settings: settings,
      source: new SpreadsheetSource(settings),
      rowCache: new ScriptRowCache(CacheService.getScriptCache()),
      idGenerator: new UuidIdGenerator(),
      currentUser: currentUser,
      audit: AuditStamper.create({ clock: clock, currentUser: currentUser }),
      accessResolver: new IdentityClient({
        settings: settings,
        http: UrlFetchApp,
        store: cacheStore,
        hasher: new Sha256Hasher(),
        clock: clock,
        decodeBase64Url: Composition.decodeBase64Url
      }),
      lockGuard: new ScriptLockGuard(LockService.getScriptLock())
    };
  },

  decodeBase64Url: function (text) {
    return Utilities.newBlob(Utilities.base64DecodeWebSafe(text)).getDataAsString();
  },

  createRepositories: function (source, rowCache) {
    return {
      category: DeviceManagement.createCategoryRepository(source, rowCache),
      equipment: DeviceManagement.createEquipmentRepository(source, rowCache),
      maintenance: DeviceManagement.createMaintenanceRepository(source, rowCache)
    };
  },

  // Each port is implemented by the module that owns the data, so no module reads another module's sheet.
  createCrossModulePorts: function (repositories) {
    return {
      categoryLookup: DeviceManagement.createCategoryLookup(repositories.category),
      equipmentLookup: DeviceManagement.createEquipmentLookup(repositories.equipment),
      equipmentCategoryUsage: DeviceManagement.createCategoryUsage(repositories.equipment),
      logCascade: DeviceManagement.createLogCascade(repositories.maintenance)
    };
  },

  createModuleDeps: function (core, repositories, ports) {
    return {
      category: {
        repository: repositories.category,
        audit: core.audit,
        idGenerator: core.idGenerator,
        equipmentUsage: ports.equipmentCategoryUsage
      },
      equipment: {
        repository: repositories.equipment,
        audit: core.audit,
        idGenerator: core.idGenerator,
        categoryLookup: ports.categoryLookup,
        logCascade: ports.logCascade
      },
      maintenance: {
        repository: repositories.maintenance,
        audit: core.audit,
        idGenerator: core.idGenerator,
        equipmentLookup: ports.equipmentLookup
      }
    };
  },

  createEndpointRegistry: function (deps) {
    return Object.assign({}, DeviceManagement.createEndpoints(deps), SystemEndpoints.build());
  },

  createSchemaDefinitions: function (deps) {
    return DeviceManagement.schemaDefinitions(deps.category);
  }
};
