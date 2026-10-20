// Composition root: the only place that wires implementations to ports.
// Everything is built inside functions at request time, so file load order never matters.
var Composition = {
  createApp: function () {
    var core = Composition.createCore();
    var repositories = ExpenseTracking.createRepositories(core.source, core.rowCache);
    var deps = Composition.createModuleDeps(core, repositories);
    return {
      accessResolver: core.accessResolver,
      lockGuard: core.lockGuard,
      // Legacy names are renamed first so the installer upgrades the old tabs instead of creating empty new ones.
      renameLegacyNames: function () {
        ExpenseTracking.Persistence.GoogleSheet.LegacyNamesMigration.run(core.source.open());
      },
      router: new Router(
        Object.assign({}, ExpenseTracking.createEndpoints(deps), SystemEndpoints.build()),
        [].concat(ExpenseTracking.readActions(), SystemEndpoints.readActions())
      ),
      schemaInstaller: new SheetInstaller(core.source, ExpenseTracking.schemaDefinitions(), {
        settings: core.settings,
        rowCache: core.rowCache
      })
    };
  },

  createModuleDeps: function (core, repositories) {
    var common = { audit: core.audit, ids: core.ids };
    return {
      paymentMethod: Object.assign({
        paymentMethods: repositories.paymentMethods,
        usage: Composition.createPaymentMethodUsage(repositories)
      }, common),
      template: Object.assign({ templates: repositories.templates, paymentMethods: repositories.paymentMethods }, common),
      expense: Object.assign({
        expenses: repositories.expenses,
        templates: repositories.templates,
        paymentMethods: repositories.paymentMethods,
        clock: core.clock
      }, common)
    };
  },

  // A payment method is in use while any expense or template references it.
  createPaymentMethodUsage: function (repositories) {
    return {
      isPaymentMethodUsed: function (id) {
        return repositories.expenses.isPaymentMethodReferenced(id) || repositories.templates.isPaymentMethodReferenced(id);
      }
    };
  },

  createCore: function () {
    // Host services are handed to the library: its own PropertiesService/CacheService/LockService/UrlFetchApp scopes differ.
    var settings = ScriptSettings.fromProperties(PropertiesService.getScriptProperties());
    var clock = new SystemClock();
    return {
      settings: settings,
      clock: clock,
      source: new SpreadsheetSource(settings),
      rowCache: new ScriptRowCache(CacheService.getScriptCache()),
      ids: new UuidIdGenerator(),
      audit: ExpenseAuditStamper.create(clock),
      accessResolver: new IdentityClient({
        settings: settings,
        http: UrlFetchApp,
        store: CacheService.getScriptCache(),
        hasher: new Sha256Hasher(),
        clock: clock,
        decodeBase64Url: Composition.decodeBase64Url
      }),
      lockGuard: new ScriptLockGuard(LockService.getScriptLock())
    };
  },

  decodeBase64Url: function (text) {
    return Utilities.newBlob(Utilities.base64DecodeWebSafe(text)).getDataAsString();
  }
};
