// Use case: read one role. deps: { roles, authorizer }. input: { idToken, id }.
Roles.Application.GetRole = {
  execute: function (deps, input) {
    deps.authorizer.requireAdmin(input.idToken);
    return Roles.Application.RoleSupportService.requireRole(deps, input.id);
  }
};
