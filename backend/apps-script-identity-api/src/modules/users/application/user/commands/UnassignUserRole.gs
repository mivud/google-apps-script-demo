// Use case: take a role away from a user. Unassigning a role the user does not have is a no-op.
// deps: { users, lockout, authorizer, audit }. input: { idToken, userId, roleId }.
Users.Application.UnassignUserRole = {
  execute: function (deps, input) {
    var actor = deps.authorizer.requireAdmin(input.idToken).email;
    var user = Users.Application.UserSupportService.requireUser(deps, input.userId);
    if (!Users.Domain.User.hasRole(user, input.roleId)) return user;
    var stamp = deps.audit.modified(user.audit, actor);
    var updated = Users.Domain.User.withAudit(Users.Domain.User.withoutRole(user, input.roleId), stamp);
    // Known gap until phase 2 backfills user_roles from users.role: a legacy user with no user_roles rows stays admin
    // through the EffectiveAccess fallback even after the last explicit role is unassigned.
    deps.lockout.assertAllowed({ before: user, after: updated, actorEmail: actor });
    deps.users.removeRole(user.id, input.roleId);
    deps.users.update(updated);
    return updated;
  }
};
