// Authorization by role for this API. Roles come from identity-api; this file only decides what each role may run.
// Reads are open to every known role; anything else needs admin. Unknown roles are denied.
var AccessControl = {
  ROLE_ADMIN: 'admin',
  ROLE_VIEWER: 'viewer',

  assertCanRead: function (role) {
    if (role !== AccessControl.ROLE_ADMIN && role !== AccessControl.ROLE_VIEWER) throw ApiError.forbidden();
  },

  assertCanWrite: function (role) {
    if (role !== AccessControl.ROLE_ADMIN) throw ApiError.forbidden();
  }
};
