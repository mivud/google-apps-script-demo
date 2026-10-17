// Use case: give a catalog claim to a role. Adding a claim the role already has is a no-op.
// deps: { roles, claimCatalog, authorizer, audit }. input: { idToken, roleId, key, value }.
Roles.Application.AddRoleClaim = {
  execute: function (deps, input) {
    var actor = deps.authorizer.requireAdmin(input.idToken).email;
    var role = Roles.Application.RoleSupportService.requireRole(deps, input.roleId);
    var claim = { key: input.key, value: input.value };
    if (!deps.claimCatalog.exists(claim)) throw DomainError.create(DomainError.CODE.CLAIM_UNKNOWN);
    if (Roles.Domain.Role.hasClaim(role, claim)) return role;
    Roles.Domain.Role.assertCanAddClaim(role);
    var updated = Roles.Domain.Role.withAudit(Roles.Domain.Role.withClaim(role, claim), deps.audit.modified(role.audit, actor));
    deps.roles.addClaim(role.id, claim, deps.audit.created(actor));
    deps.roles.update(updated);
    return updated;
  }
};
