// Use case: list every role with its claims. deps: { roles, authorizer }. input: { idToken }.
Roles.Application.ListRoles = {
  execute: function (deps, input) {
    deps.authorizer.requireRead(input.idToken);
    return { items: deps.roles.list() };
  }
};
