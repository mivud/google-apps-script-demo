// Role entity -> wire JSON (snake_case, audit fields included).
Roles.Endpoints.RoleJsonMapper = {
  toJson: function (role) {
    return Object.assign({
      id: role.id,
      name: role.name,
      description: role.description,
      claims: role.claims.map(function (claim) { return { key: claim.key, value: claim.value }; })
    }, AuditColumns.toRow(role.audit));
  }
};
