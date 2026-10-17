// Use case: read one user. deps: { users, authorizer }. input: { idToken, id }.
Users.Application.GetUser = {
  execute: function (deps, input) {
    deps.authorizer.requireRead(input.idToken);
    return Users.Application.UserSupportService.requireUser(deps, input.id);
  }
};
