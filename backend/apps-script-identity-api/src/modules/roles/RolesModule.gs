// Namespace root of the roles module. Must load before every other file of the module.
// The functions below are the module's public surface; the composition root is the only caller.
var Roles = {
  Domain: {},
  Application: {},
  Endpoints: {},
  Persistence: { GoogleSheet: {} },

  createRoleRepository: function (source, cache) {
    return Roles.Persistence.GoogleSheet.RoleRepository.create(source, cache);
  },

  // parts: { roles (RoleRepository), roleUsage ({ isRoleAssigned }), claimCatalog ({ exists }), authorizer, audit, ids }.
  createDeps: function (parts) {
    return {
      roles: parts.roles,
      roleUsage: parts.roleUsage,
      claimCatalog: parts.claimCatalog,
      authorizer: parts.authorizer,
      audit: parts.audit,
      ids: parts.ids
    };
  },

  // Handlers take { idToken, payload, nonce } built by Main.gs from the request.
  createEndpoints: function (deps) {
    return Roles.Endpoints.RoleEndpoints.build(deps);
  },

  readActions: function () {
    return Roles.Endpoints.RoleEndpoints.readActions();
  },

  // Idempotent: creates the built-in roles only while the roles sheet is empty.
  seedBuiltInRoles: function (deps) {
    Roles.Application.SeedBuiltInRoles.execute(deps);
  },

  schemaDefinitions: function () {
    var repository = Roles.Persistence.GoogleSheet.RoleRepository;
    return [{ schema: repository.SCHEMA }, { schema: repository.CLAIMS_SCHEMA }];
  }
};
