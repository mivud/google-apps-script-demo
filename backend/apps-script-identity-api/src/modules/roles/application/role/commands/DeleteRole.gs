// Use case: delete a role (and its claim assignments) unless it is built in or assigned to a user.
// deps: { roles, roleUsage, authorizer }. input: { idToken, id }.
Roles.Application.DeleteRole = {
  execute: function (deps, input) {
    deps.authorizer.requireWrite(input.idToken);
    var role = Roles.Application.RoleSupportService.requireRole(deps, input.id);
    Roles.Domain.Role.assertCanDelete(role);
    if (deps.roleUsage.isRoleAssigned(role.id)) throw DomainError.create(DomainError.CODE.ROLE_IN_USE);
    deps.roles.delete(role.id);
    return {};
  }
};
