// Rule shared by the use cases: a verified identity must belong to an active user on the allowlist.
// Unknown, inactive or role-less users get FORBIDDEN. deps: { users }.
Auth.Application.AccessSupportService = {
  requireActiveUser: function (deps, identity) {
    var user = deps.users.findByEmail(Auth.Domain.Email.of(identity.email));
    if (!user || !Auth.Domain.User.canSignIn(user)) throw ApiError.forbidden();
    return user;
  },

  toAccess: function (user) {
    return { email: user.email, role: user.role };
  }
};
