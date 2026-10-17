// Value object: free text describing a role, 0-200 characters.
Roles.Domain.RoleDescription = {
  MAX_LENGTH: 200,

  of: function (raw) {
    if (typeof raw !== 'string' || raw.length > Roles.Domain.RoleDescription.MAX_LENGTH) {
      throw DomainError.create(DomainError.CODE.ROLE_DESCRIPTION_INVALID);
    }
    return raw;
  }
};
