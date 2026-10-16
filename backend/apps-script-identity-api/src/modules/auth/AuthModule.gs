// Namespace root of the auth module. Must load before every other file of the module.
// Layer files attach themselves, e.g. Auth.Domain.User = { ... }.
// The functions below are the module's public surface; the composition root is the only caller.
// Layer namespaces are resolved inside functions, so load order of layer files never matters.
var Auth = {
  Domain: {},
  Application: {},
  Endpoints: {},
  Persistence: { GoogleSheet: {} },

  createUserRepository: function (source, cache) {
    return Auth.Persistence.GoogleSheet.UserRepository.create(source, cache);
  },

  // deps: { users (UserRepository), tokenVerifier (TokenVerifier), hasher (Hasher) }.
  createDeps: function (users, tokenVerifier, hasher) {
    return { users: users, tokenVerifier: tokenVerifier, hasher: hasher };
  },

  // Handlers take { idToken, nonce } built by Main.gs from the request.
  createEndpoints: function (deps) {
    return Object.assign({},
      Auth.Endpoints.SessionEndpoints.build(deps),
      Auth.Endpoints.AccessEndpoints.build(deps));
  },

  // These actions never change data, so the router runs them without the write lock.
  readActions: function () {
    return [].concat(Auth.Endpoints.SessionEndpoints.readActions(), Auth.Endpoints.AccessEndpoints.readActions());
  },

  schemaDefinitions: function () {
    return [{ schema: Auth.Persistence.GoogleSheet.UserRepository.SCHEMA }];
  }
};
