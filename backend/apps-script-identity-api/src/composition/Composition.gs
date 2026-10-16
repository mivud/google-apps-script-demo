// Composition root: the only place that wires implementations to ports.
// Everything is built inside functions at request time, so file load order never matters.
var Composition = {
  createApp: function () {
    var core = Composition.createCore();
    var users = Auth.createUserRepository(core.source, core.rowCache);
    var auth = Auth.createDeps(users, core.tokenVerifier, core.hasher);
    var readActions = [].concat(Auth.readActions(), SystemEndpoints.readActions());
    var handlers = Object.assign({}, Auth.createEndpoints(auth), SystemEndpoints.build());
    return {
      lockGuard: core.lockGuard,
      tokenVerifier: core.tokenVerifier,
      router: new Router(handlers, readActions),
      schemaInstaller: new SheetInstaller(core.source, Auth.schemaDefinitions(), {
        settings: core.settings,
        rowCache: core.rowCache
      })
    };
  },

  createCore: function () {
    // Host services are handed to the library: its own PropertiesService/CacheService/LockService/UrlFetchApp scopes differ.
    var settings = ScriptSettings.fromProperties(PropertiesService.getScriptProperties());
    return {
      settings: settings,
      source: new SpreadsheetSource(settings),
      rowCache: new ScriptRowCache(CacheService.getScriptCache()),
      hasher: new Sha256Hasher(),
      tokenVerifier: new GoogleIdTokenVerifier({
        settings: settings,
        clock: new SystemClock(),
        cache: new CacheVerifiedTokens(CacheService.getScriptCache()),
        http: UrlFetchApp
      }),
      lockGuard: new ScriptLockGuard(LockService.getScriptLock())
    };
  }
};
