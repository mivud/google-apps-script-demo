// Gathers the data the lockout rule needs: the access of the changed user before/after, and how many active supers exist.
// deps: { users, roles }. change: { before, after (null on delete), actorEmail } with full User entities.
AccessControl.Application.SuperLockoutService = {
  assertAllowed: function (deps, change) {
    var service = AccessControl.Application.SuperLockoutService;
    var roles = deps.roles.list();
    var rule = AccessControl.Domain.SuperLockoutRule;
    var activeSuperCount = deps.users.list().filter(function (user) {
      return rule.isActiveSuper(service.snapshot(user, roles));
    }).length;
    rule.assertAllowed({
      before: service.snapshot(change.before, roles),
      after: change.after ? service.snapshot(change.after, roles) : null,
      actorEmail: change.actorEmail,
      activeSuperCount: activeSuperCount
    });
  },

  snapshot: function (user, roles) {
    var access = AccessControl.Domain.EffectiveAccess.resolve(user, roles);
    return { email: user.email, active: user.active, isSuper: access.roles.indexOf(AccessControl.Domain.PrimaryRole.SUPER) !== -1 };
  }
};
