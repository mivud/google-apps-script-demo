// Rules shared by the role use cases. deps: { roles }.
Roles.Application.RoleSupportService = {
  requireRole: function (deps, id) {
    var role = deps.roles.findById(id);
    if (!role) throw DomainError.notFound('Role', id);
    return role;
  },

  assertNameFree: function (deps, name, exceptId) {
    var existing = deps.roles.findByName(name);
    if (existing && existing.id !== exceptId) throw DomainError.create(DomainError.CODE.ROLE_NAME_DUPLICATE);
  }
};
