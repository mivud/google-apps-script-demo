// Authorization for the admin actions: decided only from the verified token and stored data, never from the client.
// deps: { users, roles, tokenVerifier }. Returns { email } of the admin; a non-admin gets FORBIDDEN.
AccessControl.Application.AdminAuthorizationService = {
  requireAdmin: function (deps, idToken) {
    var identity = deps.tokenVerifier.verify(idToken);
    var signedIn = AccessControl.Application.AccessSupportService.requireSignedIn(deps, identity);
    if (signedIn.access.role !== AccessControl.Domain.PrimaryRole.ADMIN) throw ApiError.forbidden();
    return { email: signedIn.user.email };
  }
};
