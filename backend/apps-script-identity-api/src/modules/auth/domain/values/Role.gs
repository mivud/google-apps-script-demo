// Value object: the permission level of a user.
Auth.Domain.Role = {
  ADMIN: 'admin',
  VIEWER: 'viewer',

  isValid: function (value) {
    var role = Auth.Domain.Role;
    return value === role.ADMIN || value === role.VIEWER;
  },

  // Parses a stored value; unknown values yield '' so they never grant access.
  parse: function (value) {
    var normalized = String(value).trim().toLowerCase();
    return Auth.Domain.Role.isValid(normalized) ? normalized : '';
  }
};
