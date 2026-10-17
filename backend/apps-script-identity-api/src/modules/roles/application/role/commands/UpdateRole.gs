// Use case: rename / re-describe a role (optimistic concurrency on last_modified).
// deps: { roles, authorizer, audit }. input: { idToken, id, name, description, expectedLastModified }.
Roles.Application.UpdateRole = {
  execute: function (deps, input) {
    var support = Roles.Application.RoleSupportService;
    var actor = deps.authorizer.requireWrite(input.idToken).email;
    var role = support.requireRole(deps, input.id);
    IdentityAuditStamper.assertUnchanged(role.audit, input.expectedLastModified);
    var updated = Roles.Domain.Role.edit(role, {
      name: input.name,
      description: input.description,
      audit: deps.audit.modified(role.audit, actor)
    });
    support.assertNameFree(deps, updated.name, role.id);
    deps.roles.update(updated);
    return updated;
  }
};
