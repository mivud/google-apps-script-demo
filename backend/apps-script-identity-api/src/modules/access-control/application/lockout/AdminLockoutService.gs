// Gathers the data the lockout rule needs: the access of the changed user before/after, and how many active admins exist.
// deps: { users, roles }. change: { before, after (null on delete), actorEmail } with full User entities.
AccessControl.Application.AdminLockoutService = {
  assertAllowed: function (deps, change) {
    var service = AccessControl.Application.AdminLockoutService;
    var roles = deps.roles.list();
    var rule = AccessControl.Domain.AdminLockoutRule;
    var activeAdminCount = deps.users.list().filter(function (user) {
      return rule.isActiveAdmin(service.snapshot(user, roles));
    }).length;
    rule.assertAllowed({
      before: service.snapshot(change.before, roles),
      after: change.after ? service.snapshot(change.after, roles) : null,
      actorEmail: change.actorEmail,
      activeAdminCount: activeAdminCount
    });
  },

  snapshot: function (user, roles) {
    var access = AccessControl.Domain.EffectiveAccess.resolve(user, roles);
    return { email: user.email, active: user.active, role: access.role };
  }
};
