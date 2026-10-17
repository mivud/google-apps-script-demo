// Rules shared by the user use cases. deps: { users, roles }.
Users.Application.UserSupportService = {
  requireUser: function (deps, id) {
    var user = deps.users.findById(id);
    if (!user) throw DomainError.notFound('User', id);
    return user;
  },

  assertEmailFree: function (deps, email, exceptId) {
    var existing = deps.users.findByEmail(email);
    if (existing && existing.id !== exceptId) throw DomainError.create(DomainError.CODE.USER_EMAIL_DUPLICATE);
  },

  requireRoleExists: function (deps, roleId) {
    if (!deps.roles.exists(roleId)) throw DomainError.notFound('Role', roleId);
  }
};
