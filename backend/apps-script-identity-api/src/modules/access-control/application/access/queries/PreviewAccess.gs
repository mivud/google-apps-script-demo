// Use case: show the effective access of any user (needs identity.read). The target does not need to be active.
// deps: { users, roles, tokenVerifier }. input: { idToken, userId }.
AccessControl.Application.PreviewAccess = {
  execute: function (deps, input) {
    AccessControl.Application.PermissionAuthorizationService.requireRead(deps, input.idToken);
    var user = deps.users.findById(input.userId);
    if (!user) throw DomainError.notFound('User', input.userId);
    var access = AccessControl.Domain.EffectiveAccess.resolve(user, deps.roles.list());
    return AccessControl.Application.AccessSupportService.toAccess(access);
  }
};
