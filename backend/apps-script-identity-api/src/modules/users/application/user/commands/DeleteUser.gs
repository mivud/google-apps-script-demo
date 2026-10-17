// Use case: remove a user with their role assignments and own claims.
// deps: { users, lockout, authorizer }. input: { idToken, id }.
Users.Application.DeleteUser = {
  execute: function (deps, input) {
    var actor = deps.authorizer.requireAdmin(input.idToken).email;
    var user = Users.Application.UserSupportService.requireUser(deps, input.id);
    deps.lockout.assertAllowed({ before: user, after: null, actorEmail: actor });
    deps.users.delete(user.id);
    return {};
  }
};
