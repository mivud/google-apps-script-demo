// Domain service (pure): computes what a user may do from the user and the full role list.
// user: { email, active, legacyRole, roleIds, claims }. roles: [{ id, name, claims }].
AccessControl.Domain.EffectiveAccess = {
  // Returns { email, role, roles (sorted names), claims (effective, sorted) }.
  resolve: function (user, roles) {
    var access = AccessControl.Domain.EffectiveAccess;
    var held = access.heldRoles(user, roles);
    var names = access.roleNames(user, held);
    return {
      email: user.email,
      role: AccessControl.Domain.PrimaryRole.fromRoleNames(names),
      roles: names,
      claims: access.effectiveClaims(held, user.claims)
    };
  },

  canSignIn: function (user, access) {
    return user.active && access.role !== AccessControl.Domain.PrimaryRole.NONE;
  },

  // Phase 1 fallback: a user with no role assignments gets the role named in the legacy column.
  legacyName: function (user) {
    var name = String(user.legacyRole).trim().toLowerCase();
    return AccessControl.Domain.PrimaryRole.isBuiltIn(name) ? name : '';
  },

  heldRoles: function (user, roles) {
    if (user.roleIds.length > 0) return roles.filter(function (role) { return user.roleIds.indexOf(role.id) !== -1; });
    var legacy = AccessControl.Domain.EffectiveAccess.legacyName(user);
    return roles.filter(function (role) { return legacy !== '' && String(role.name).toLowerCase() === legacy; });
  },

  roleNames: function (user, held) {
    var access = AccessControl.Domain.EffectiveAccess;
    var names = user.roleIds.length === 0 && access.legacyName(user) !== ''
      ? [access.legacyName(user)]
      : held.map(function (role) { return role.name; });
    return names.filter(function (name, at) { return names.indexOf(name) === at; }).sort(ClaimOrder.compareText);
  },

  // A claim key the user owns overrides every role claim with that key.
  effectiveClaims: function (held, ownClaims) {
    var ownKeys = ownClaims.map(function (claim) { return claim.key; });
    var inherited = [].concat.apply([], held.map(function (role) { return role.claims; }))
      .filter(function (claim) { return ownKeys.indexOf(claim.key) === -1; });
    return ClaimOrder.distinctSorted(inherited.concat(ownClaims));
  }
};
