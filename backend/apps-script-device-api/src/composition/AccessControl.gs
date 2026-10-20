// Authorization for this API. identity-api says who the user is, which roles and which claims they have;
// this file only decides what each may run. The super role always passes. Unknown users never reach this point.
// The frontend gates the app by the same permission claims; there is no separate app claim.
var AccessControl = {
  ROLE_SUPER: 'super',
  PERMISSION_KEY: 'permission',
  PERMISSION_READ: 'device.mgt.read',
  PERMISSION_WRITE: 'device.mgt.write',

  assertCanRead: function (access) {
    if (!AccessControl.holds(access, AccessControl.PERMISSION_READ)) throw ApiError.forbidden();
  },

  assertCanWrite: function (access) {
    if (!AccessControl.holds(access, AccessControl.PERMISSION_WRITE)) throw ApiError.forbidden();
  },

  // Exact, case-sensitive match on the sanitized claims from IdentityClient.
  holds: function (access, permission) {
    if (!access) return false;
    if (access.role === AccessControl.ROLE_SUPER) return true;
    if (Array.isArray(access.roles) && access.roles.indexOf(AccessControl.ROLE_SUPER) !== -1) return true;
    if (!Array.isArray(access.claims)) return false;
    return access.claims.some(function (claim) {
      return claim.key === AccessControl.PERMISSION_KEY && claim.value === permission;
    });
  }
};
