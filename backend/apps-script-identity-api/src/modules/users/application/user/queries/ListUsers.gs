// Use case: list every user. deps: { users, authorizer }. input: { idToken }.
Users.Application.ListUsers = {
  execute: function (deps, input) {
    deps.authorizer.requireAdmin(input.idToken);
    return { items: deps.users.list() };
  }
};
