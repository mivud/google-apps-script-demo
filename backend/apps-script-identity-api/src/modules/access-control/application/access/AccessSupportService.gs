// Rule shared by the use cases: a verified identity must belong to an active user on the allowlist with a primary role.
// Unknown, inactive or role-less users get FORBIDDEN. deps: { users, roles }.
AccessControl.Application.AccessSupportService = {
  // Returns { user, access }.
  requireSignedIn: function (deps, identity) {
    var user = deps.users.findByEmail(identity.email);
    if (!user) throw ApiError.forbidden();
    var access = AccessControl.Domain.EffectiveAccess.resolve(user, deps.roles.list());
    if (!AccessControl.Domain.EffectiveAccess.canSignIn(user, access)) throw ApiError.forbidden();
    return { user: user, access: access };
  },

  toAccess: function (access) {
    return { email: access.email, role: access.role, roles: access.roles, claims: access.claims };
  }
};
