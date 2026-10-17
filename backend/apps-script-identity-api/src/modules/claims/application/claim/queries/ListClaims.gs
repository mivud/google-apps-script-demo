// Use case: list every claim of the catalog. deps: { claims, authorizer }. input: { idToken }.
Claims.Application.ListClaims = {
  execute: function (deps, input) {
    deps.authorizer.requireAdmin(input.idToken);
    return { items: deps.claims.list() };
  }
};
