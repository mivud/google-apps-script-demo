// Namespace root of the access-control module. Must load before every other file of the module.
// It decides what a verified identity may do: sign-in, effective roles/claims, permission authorization, lockout rules.
// The functions below are the module's public surface; the composition root is the only caller.
var AccessControl = {
  Domain: {},
  Application: {},
  Endpoints: {},

  // users: { findByEmail(raw), findById(id), list() }, roles: { list() } (the module only reads), tokenVerifier, hasher.
  createDeps: function (users, roles, tokenVerifier, hasher) {
    return { users: users, roles: roles, tokenVerifier: tokenVerifier, hasher: hasher };
  },

  // Port for the other modules: { requireRead(idToken), requireWrite(idToken) } -> { email }.
  // Throws UNAUTHORIZED or FORBIDDEN. The `super` role passes both.
  createAuthorizer: function (deps) {
    var service = AccessControl.Application.PermissionAuthorizationService;
    return {
      requireRead: function (idToken) { return service.requireRead(deps, idToken); },
      requireWrite: function (idToken) { return service.requireWrite(deps, idToken); }
    };
  },

  // Port for the users module: { assertAllowed({ before, after, actorEmail }) } enforcing last_super / self_lockout.
  createLockoutGuard: function (deps) {
    return {
      assertAllowed: function (change) {
        AccessControl.Application.SuperLockoutService.assertAllowed(deps, change);
      }
    };
  },

  // Handlers take { idToken, payload, nonce } built by Main.gs from the request.
  createEndpoints: function (deps) {
    return Object.assign({},
      AccessControl.Endpoints.SessionEndpoints.build(deps),
      AccessControl.Endpoints.AccessEndpoints.build(deps),
      AccessControl.Endpoints.AccessPreviewEndpoints.build(deps));
  },

  // These actions never change data, so the router runs them without the write lock.
  readActions: function () {
    return [].concat(
      AccessControl.Endpoints.SessionEndpoints.readActions(),
      AccessControl.Endpoints.AccessEndpoints.readActions(),
      AccessControl.Endpoints.AccessPreviewEndpoints.readActions());
  }
};
