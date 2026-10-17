// Use case: create a role. deps: { roles, authorizer, audit, ids }. input: { idToken, name, description }.
Roles.Application.CreateRole = {
  execute: function (deps, input) {
    var actor = deps.authorizer.requireWrite(input.idToken).email;
    var role = Roles.Domain.Role.create({
      id: deps.ids.newId(),
      name: input.name,
      description: input.description,
      audit: deps.audit.created(actor)
    });
    Roles.Domain.Role.assertCanCreate(deps.roles.list().length);
    Roles.Application.RoleSupportService.assertNameFree(deps, role.name, role.id);
    deps.roles.insert(role);
    return role;
  }
};
