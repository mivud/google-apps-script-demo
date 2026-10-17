// Use case: add a user to the allowlist, optionally with roles.
// deps: { users, roles, authorizer, audit, ids }. input: { idToken, email, active, roleIds }.
Users.Application.CreateUser = {
  execute: function (deps, input) {
    var support = Users.Application.UserSupportService;
    var actor = deps.authorizer.requireAdmin(input.idToken).email;
    var user = Users.Domain.User.create({
      id: deps.ids.newId(),
      email: input.email,
      active: input.active,
      roleIds: input.roleIds,
      audit: deps.audit.created(actor)
    });
    Users.Domain.User.assertCanCreate(deps.users.list().length);
    support.assertEmailFree(deps, user.email, user.id);
    user.roleIds.forEach(function (roleId) { support.requireRoleExists(deps, roleId); });
    deps.users.insert(user);
    return user;
  }
};
