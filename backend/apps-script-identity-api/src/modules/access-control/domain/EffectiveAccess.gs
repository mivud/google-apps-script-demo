// Domain service (pure): computes what a user may do from the user and the full role list.
// user: { email, active, roleIds, claims }. roles: [{ id, name, claims }].
AccessControl.Domain.EffectiveAccess = {
  // Returns { email, role, roles (sorted names), claims (effective, sorted) }.
  resolve: function (user, roles) {
    var access = AccessControl.Domain.EffectiveAccess;
    var held = roles.filter(function (role) { return user.roleIds.indexOf(role.id) !== -1; });
    var names = access.roleNames(held);
    return {
      email: user.email,
      role: AccessControl.Domain.PrimaryRole.fromRoleNames(names),
      roles: names,
      claims: access.effectiveClaims(held, user.claims)
    };
  },

  // A known active user may sign in even without roles or claims; the client then shows no apps.
  canSignIn: function (user) {
    return user.active;
  },

  roleNames: function (held) {
    var names = held.map(function (role) { return role.name; });
    return names.filter(function (name, at) { return names.indexOf(name) === at; }).sort(ClaimOrder.compareText);
  },

  // Role claims are additive; one is dropped only when the user owns the exact same (key, value).
  effectiveClaims: function (held, ownClaims) {
    var inherited = [].concat.apply([], held.map(function (role) { return role.claims; }));
    return ClaimOrder.distinctSorted(inherited.concat(ownClaims));
  }
};
