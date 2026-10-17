// Row <-> Role mapping stays here: sheet columns are persistence details.
Roles.Persistence.GoogleSheet.RoleRowMapper = {
  toRole: function (row, claims) {
    return {
      id: String(row.id).toLowerCase(),
      name: row.name,
      description: row.description,
      claims: claims,
      audit: AuditColumns.fromRow(row)
    };
  },

  toRow: function (role) {
    return Object.assign({ id: role.id, name: role.name, description: role.description }, AuditColumns.toRow(role.audit));
  },

  toClaimRow: function (roleId, claim, audit) {
    return Object.assign({ role_id: roleId, key: claim.key, value: claim.value }, AuditColumns.toRow(audit));
  }
};
