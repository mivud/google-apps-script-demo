// User entity -> wire JSON (snake_case, audit fields included). The legacy role column is never exposed.
Users.Endpoints.UserJsonMapper = {
  toJson: function (user) {
    return Object.assign({
      id: user.id,
      email: user.email,
      active: user.active,
      role_ids: user.roleIds.slice(),
      claims: user.claims.map(function (claim) { return { key: claim.key, value: claim.value }; })
    }, AuditColumns.toRow(user.audit));
  }
};
