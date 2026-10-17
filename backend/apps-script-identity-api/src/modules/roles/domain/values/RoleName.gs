// Value object: the unique, machine-friendly name of a role (lowercase, starts with a letter).
Roles.Domain.RoleName = {
  SHAPE: /^[a-z][a-z0-9_-]{1,31}$/,

  of: function (raw) {
    if (typeof raw !== 'string' || !Roles.Domain.RoleName.SHAPE.test(raw)) {
      throw DomainError.create(DomainError.CODE.ROLE_NAME_INVALID);
    }
    return raw;
  },

  // Names compare case-insensitively so hand-edited rows cannot create look-alike duplicates.
  same: function (a, b) {
    return String(a).toLowerCase() === String(b).toLowerCase();
  }
};
