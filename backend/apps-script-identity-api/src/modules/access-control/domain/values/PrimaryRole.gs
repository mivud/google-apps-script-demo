// Value object: the legacy-compatible primary role derived from role names: admin, else viewer, else '' (no access).
AccessControl.Domain.PrimaryRole = {
  ADMIN: 'admin',
  VIEWER: 'viewer',
  NONE: '',

  isBuiltIn: function (name) {
    var role = AccessControl.Domain.PrimaryRole;
    return name === role.ADMIN || name === role.VIEWER;
  },

  fromRoleNames: function (roleNames) {
    var role = AccessControl.Domain.PrimaryRole;
    var lowered = roleNames.map(function (name) { return String(name).toLowerCase(); });
    if (lowered.indexOf(role.ADMIN) !== -1) return role.ADMIN;
    return lowered.indexOf(role.VIEWER) !== -1 ? role.VIEWER : role.NONE;
  }
};
