// Namespace root of the device-management module. Must load before every other file of the module.
// Layer files attach themselves, e.g. DeviceManagement.Domain.Equipment = { ... }.
// The functions below are the module's public surface; the composition root is the only caller.
// Layer namespaces are resolved inside functions, so load order of layer files never matters.
var DeviceManagement = {
  Domain: {},
  Application: {},
  Endpoints: {},
  Persistence: { GoogleSheet: {} },

  createCategoryRepository: function (source) {
    return DeviceManagement.Persistence.GoogleSheet.CategoryService.createRepository(source);
  },

  createCategoryLookup: function (repository) {
    return DeviceManagement.Persistence.GoogleSheet.CategoryService.createLookup(repository);
  },

  createEquipmentRepository: function (source) {
    return DeviceManagement.Persistence.GoogleSheet.EquipmentService.createRepository(source);
  },

  createCategoryUsage: function (repository) {
    return DeviceManagement.Persistence.GoogleSheet.EquipmentService.createCategoryUsage(repository);
  },

  createEquipmentLookup: function (repository) {
    return DeviceManagement.Persistence.GoogleSheet.EquipmentService.createLookup(repository);
  },

  createMaintenanceRepository: function (source) {
    return DeviceManagement.Persistence.GoogleSheet.MaintenanceLogService.createRepository(source);
  },

  createLogCascade: function (repository) {
    return DeviceManagement.Persistence.GoogleSheet.MaintenanceLogService.createLogCascade(repository);
  },

  // deps: { category, equipment, maintenance }, each shaped as the matching handler expects.
  createEndpoints: function (deps) {
    var handlers = DeviceManagement.Endpoints;
    return Object.assign(
      {},
      handlers.CategoryEndpoints.build(deps.category),
      handlers.EquipmentEndpoints.build(deps.equipment),
      handlers.MaintenanceLogEndpoints.build(deps.maintenance)
    );
  },

  // Lazy factory so the category sheet is only read when a legacy migration actually runs.
  createRootResolverFactory: function (categoryDeps) {
    return function () {
      return DeviceManagement.Persistence.GoogleSheet.CategoryService.createRootResolver(categoryDeps);
    };
  },

  // Categories first: the legacy equipment migration appends rows to the categories tab.
  schemaDefinitions: function (categoryDeps) {
    var sheet = DeviceManagement.Persistence.GoogleSheet;
    var createRootCategoryResolver = DeviceManagement.createRootResolverFactory(categoryDeps);
    return [
      { schema: sheet.CategoryService.SCHEMA },
      {
        schema: sheet.EquipmentService.SCHEMA,
        beforeUpgrade: sheet.EquipmentLegacyMigrationService.create(createRootCategoryResolver)
      },
      { schema: sheet.MaintenanceLogService.SCHEMA }
    ];
  }
};
