// Authorization for the identity actions: decided only from the verified token and stored data, never from the client.
// deps: { users, roles, tokenVerifier }. Returns { email } of the caller; a caller without the permission gets FORBIDDEN.
AccessControl.Application.PermissionAuthorizationService = {
  PERMISSION_KEY: 'permission',
  READ: 'identity.read',
  WRITE: 'identity.write',

  requireRead: function (deps, idToken) {
    var service = AccessControl.Application.PermissionAuthorizationService;
    return service.require(deps, idToken, service.READ);
  },

  requireWrite: function (deps, idToken) {
    var service = AccessControl.Application.PermissionAuthorizationService;
    return service.require(deps, idToken, service.WRITE);
  },

  require: function (deps, idToken, permission) {
    var service = AccessControl.Application.PermissionAuthorizationService;
    var identity = deps.tokenVerifier.verify(idToken);
    var signedIn = AccessControl.Application.AccessSupportService.requireSignedIn(deps, identity);
    if (!service.isGranted(signedIn.access, permission)) throw ApiError.forbidden();
    return { email: signedIn.user.email };
  },

  // Fails closed: anything that is not a well-formed grant or the exact `super` role is a refusal.
  isGranted: function (access, permission) {
    var service = AccessControl.Application.PermissionAuthorizationService;
    if (Array.isArray(access.roles) && access.roles.indexOf(AccessControl.Domain.PrimaryRole.SUPER) !== -1) return true;
    if (!Array.isArray(access.claims)) return false;
    return access.claims.some(function (claim) {
      return !!claim && claim.key === service.PERMISSION_KEY && claim.value === permission;
    });
  }
};
