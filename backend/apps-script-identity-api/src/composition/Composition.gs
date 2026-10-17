// Composition root: the only place that wires implementations to ports.
// Everything is built inside functions at request time, so file load order never matters.
// Modules never import each other: they get each other's capabilities as injected ports.
var Composition = {
  createApp: function () {
    return Composition.wire(Composition.createCore());
  },

  // core: { settings, source, rowCache, hasher, tokenVerifier, lockGuard, clock, ids }; tests pass fakes here.
  wire: function (core) {
    var audit = IdentityAuditStamper.create(core.clock);
    var repositories = Composition.createRepositories(core);
    var access = AccessControl.createDeps(repositories.users, repositories.roles, core.tokenVerifier, core.hasher);
    var shared = {
      authorizer: AccessControl.createAuthorizer(access),
      claimCatalog: repositories.claims,
      audit: audit,
      ids: core.ids
    };
    var claimDeps = Claims.createDeps({
      claims: repositories.claims,
      usage: Composition.createClaimUsage(repositories),
      authorizer: shared.authorizer,
      audit: audit
    });
    var roleDeps = Roles.createDeps(Object.assign({ roles: repositories.roles, roleUsage: repositories.users }, shared));
    var userDeps = Users.createDeps(Object.assign({
      users: repositories.users,
      roles: repositories.roles,
      lockout: AccessControl.createLockoutGuard(access)
    }, shared));
    var readActions = [].concat(Claims.readActions(), Roles.readActions(), Users.readActions(),
      AccessControl.readActions(), SystemEndpoints.readActions());
    var handlers = Object.assign({}, Claims.createEndpoints(claimDeps), Roles.createEndpoints(roleDeps),
      Users.createEndpoints(userDeps), AccessControl.createEndpoints(access), SystemEndpoints.build());
    return {
      lockGuard: core.lockGuard,
      tokenVerifier: core.tokenVerifier,
      router: new Router(handlers, readActions),
      seedBuiltInRoles: function () { Roles.seedBuiltInRoles(roleDeps); },
      schemaInstaller: new SheetInstaller(core.source, Composition.schemaDefinitions(), {
        settings: core.settings,
        rowCache: core.rowCache
      })
    };
  },

  createRepositories: function (core) {
    return {
      claims: Claims.createClaimRepository(core.source, core.rowCache),
      roles: Roles.createRoleRepository(core.source, core.rowCache),
      users: Users.createUserRepository(core.source, core.rowCache)
    };
  },

  // A claim is in use while any role or any user still holds it.
  createClaimUsage: function (repositories) {
    return {
      isInUse: function (claim) {
        return repositories.roles.isClaimInUse(claim) || repositories.users.isClaimInUse(claim);
      }
    };
  },

  // Order matters: referenced sheets first.
  schemaDefinitions: function () {
    return [].concat(Claims.schemaDefinitions(), Roles.schemaDefinitions(), Users.schemaDefinitions());
  },

  createCore: function () {
    // Host services are handed to the library: its own PropertiesService/CacheService/LockService/UrlFetchApp scopes differ.
    var settings = ScriptSettings.fromProperties(PropertiesService.getScriptProperties());
    var clock = new SystemClock();
    return {
      settings: settings,
      source: new SpreadsheetSource(settings),
      rowCache: new ScriptRowCache(CacheService.getScriptCache()),
      hasher: new Sha256Hasher(),
      clock: clock,
      ids: new UuidIdGenerator(),
      tokenVerifier: new GoogleIdTokenVerifier({
        settings: settings,
        clock: clock,
        cache: new CacheVerifiedTokens(CacheService.getScriptCache()),
        http: UrlFetchApp
      }),
      lockGuard: new ScriptLockGuard(LockService.getScriptLock())
    };
  }
};
