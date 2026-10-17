// Namespace root of the access-control module. Must load before every other file of the module.
// It decides what a verified identity may do: sign-in, effective roles/claims, admin authorization, lockout rules.
// The functions below are the module's public surface; the composition root is the only caller.
var AccessControl = {
  Domain: {},
  Application: {},
  Endpoints: {},

  // users: { findByEmail(raw), findById(id), list() }, roles: { list() } (the module only reads), tokenVerifier, hasher.
  createDeps: function (users, roles, tokenVerifier, hasher) {
    return { users: users, roles: roles, tokenVerifier: tokenVerifier, hasher: hasher };
  },

  // Port for the other modules: { requireAdmin(idToken) -> { email } }. Throws UNAUTHORIZED or FORBIDDEN.
  createAuthorizer: function (deps) {
    return {
      requireAdmin: function (idToken) {
        return AccessControl.Application.AdminAuthorizationService.requireAdmin(deps, idToken);
      }
    };
  },

  // Port for the users module: { assertAllowed({ before, after, actorEmail }) } enforcing last_admin / self_lockout.
  createLockoutGuard: function (deps) {
    return {
      assertAllowed: function (change) {
        AccessControl.Application.AdminLockoutService.assertAllowed(deps, change);
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
