// Row <-> User mapping stays here: sheet columns and flag text are persistence details.
Users.Persistence.GoogleSheet.UserRowMapper = {
  toUser: function (row, roleIds, claims) {
    return {
      id: String(row.id).toLowerCase(),
      email: Users.Domain.Email.normalize(row.email),
      legacyRole: String(row.role).trim(),
      active: SheetFlag.parse(row.active),
      roleIds: roleIds,
      claims: claims,
      audit: AuditColumns.fromRow(row)
    };
  },

  // The legacy `role` column is written back as read (empty for new users) so an update never strips a fallback role.
  toRow: function (user) {
    return Object.assign({
      id: user.id,
      email: user.email,
      role: user.legacyRole,
      active: SheetFlag.format(user.active)
    }, AuditColumns.toRow(user.audit));
  },

  toRoleRow: function (userId, roleId, audit) {
    return Object.assign({ user_id: userId, role_id: roleId }, AuditColumns.toRow(audit));
  },

  toClaimRow: function (userId, claim, audit) {
    return Object.assign({ user_id: userId, key: claim.key, value: claim.value }, AuditColumns.toRow(audit));
  }
};
