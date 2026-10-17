// Use case: give a role to a user. Assigning a role the user already has is a no-op.
// The lockout rules are checked because the change can add or remove the super role.
// deps: { users, roles, lockout, authorizer, audit }. input: { idToken, userId, roleId }.
Users.Application.AssignUserRole = {
  execute: function (deps, input) {
    var support = Users.Application.UserSupportService;
    var actor = deps.authorizer.requireWrite(input.idToken).email;
    var user = support.requireUser(deps, input.userId);
    support.requireRoleExists(deps, input.roleId);
    if (Users.Domain.User.hasRole(user, input.roleId)) return user;
    Users.Domain.User.assertCanAssignRole(user);
    var updated = Users.Domain.User.withAudit(Users.Domain.User.withRole(user, input.roleId), deps.audit.modified(user.audit, actor));
    deps.lockout.assertAllowed({ before: user, after: updated, actorEmail: actor });
    deps.users.addRole(user.id, input.roleId, deps.audit.created(actor));
    deps.users.update(updated);
    return updated;
  }
};
