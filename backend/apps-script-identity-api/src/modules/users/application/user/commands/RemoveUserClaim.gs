// Use case: take an own claim away from a user. Removing a claim the user does not have is a no-op.
// deps: { users, authorizer, audit }. input: { idToken, userId, key, value }.
Users.Application.RemoveUserClaim = {
  execute: function (deps, input) {
    var actor = deps.authorizer.requireAdmin(input.idToken).email;
    var user = Users.Application.UserSupportService.requireUser(deps, input.userId);
    var claim = { key: input.key, value: input.value };
    if (!Users.Domain.User.hasClaim(user, claim)) return user;
    var updated = Users.Domain.User.withAudit(Users.Domain.User.withoutClaim(user, claim), deps.audit.modified(user.audit, actor));
    deps.users.removeClaim(user.id, claim);
    deps.users.update(updated);
    return updated;
  }
};
