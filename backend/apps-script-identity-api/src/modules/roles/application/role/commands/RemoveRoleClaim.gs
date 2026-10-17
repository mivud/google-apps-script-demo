// Use case: take a claim away from a role. Removing a claim the role does not have is a no-op.
// deps: { roles, authorizer, audit }. input: { idToken, roleId, key, value }.
Roles.Application.RemoveRoleClaim = {
  execute: function (deps, input) {
    var actor = deps.authorizer.requireWrite(input.idToken).email;
    var role = Roles.Application.RoleSupportService.requireRole(deps, input.roleId);
    var claim = { key: input.key, value: input.value };
    if (!Roles.Domain.Role.hasClaim(role, claim)) return role;
    var updated = Roles.Domain.Role.withAudit(Roles.Domain.Role.withoutClaim(role, claim), deps.audit.modified(role.audit, actor));
    deps.roles.removeClaim(role.id, claim);
    deps.roles.update(updated);
    return updated;
  }
};
