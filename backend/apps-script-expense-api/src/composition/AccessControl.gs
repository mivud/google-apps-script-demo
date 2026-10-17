// Authorization for this API. identity-api says who the user is, which role and which claims they have;
// this file only decides what each may run. Admin always passes. Unknown users never reach this point.
// The frontend gates the app by the same permission claims; there is no separate app claim.
var AccessControl = {
  ROLE_ADMIN: 'admin',
  PERMISSION_KEY: 'permission',
  PERMISSION_READ: 'expense.read',
  PERMISSION_WRITE: 'expense.write',

  assertCanRead: function (access) {
    if (!AccessControl.holds(access, AccessControl.PERMISSION_READ)) throw ApiError.forbidden();
  },

  assertCanWrite: function (access) {
    if (!AccessControl.holds(access, AccessControl.PERMISSION_WRITE)) throw ApiError.forbidden();
  },

  // Exact, case-sensitive match on the sanitized claims from IdentityClient.
  holds: function (access, permission) {
    if (access.role === AccessControl.ROLE_ADMIN) return true;
    return (access.claims || []).some(function (claim) {
      return claim.key === AccessControl.PERMISSION_KEY && claim.value === permission;
    });
  }
};
