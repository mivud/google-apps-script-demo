// Namespace root of the users module. Must load before every other file of the module.
// The functions below are the module's public surface; the composition root is the only caller.
var Users = {
  Domain: {},
  Application: {},
  Endpoints: {},
  Persistence: { GoogleSheet: {} },

  createUserRepository: function (source, cache) {
    return Users.Persistence.GoogleSheet.UserRepository.create(source, cache);
  },

  // parts: { users (UserRepository), roles ({ exists }), claimCatalog ({ exists }), lockout ({ assertAllowed }),
  //          authorizer, audit, ids }.
  createDeps: function (parts) {
    return {
      users: parts.users,
      roles: parts.roles,
      claimCatalog: parts.claimCatalog,
      lockout: parts.lockout,
      authorizer: parts.authorizer,
      audit: parts.audit,
      ids: parts.ids
    };
  },

  // Handlers take { idToken, payload, nonce } built by Main.gs from the request.
  createEndpoints: function (deps) {
    return Users.Endpoints.UserEndpoints.build(deps);
  },

  readActions: function () {
    return Users.Endpoints.UserEndpoints.readActions();
  },

  schemaDefinitions: function () {
    var repository = Users.Persistence.GoogleSheet.UserRepository;
    return [{ schema: repository.SCHEMA }, { schema: repository.ROLES_SCHEMA }, { schema: repository.CLAIMS_SCHEMA }];
  }
};
