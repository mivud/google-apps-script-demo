// Use case (server-to-server): turn a Google ID token into { email, role, roles, claims } for another backend.
// deps: { users, roles, tokenVerifier }. input: { idToken }. A bad token gets UNAUTHORIZED from the verifier.
AccessControl.Application.ResolveAccess = {
  execute: function (deps, input) {
    var support = AccessControl.Application.AccessSupportService;
    var identity = deps.tokenVerifier.verify(input.idToken);
    return support.toAccess(support.requireSignedIn(deps, identity).access);
  }
};
