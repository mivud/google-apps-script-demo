// Use case: make sure the built-in roles exist. Only acts while the roles sheet is empty.
// deps: { roles, audit, ids }. Rows are created by "system".
Roles.Application.SeedBuiltInRoles = {
  DESCRIPTIONS: { admin: 'Full access', viewer: 'Read-only access' },

  execute: function (deps) {
    var seed = Roles.Application.SeedBuiltInRoles;
    if (!deps.roles.isEmpty()) return;
    Roles.Domain.Role.BUILT_IN_NAMES.forEach(function (name) {
      deps.roles.insert(Roles.Domain.Role.create({
        id: deps.ids.newId(),
        name: name,
        description: seed.DESCRIPTIONS[name],
        audit: deps.audit.created(IdentityAuditStamper.SYSTEM_ACTOR)
      }));
    });
  }
};
