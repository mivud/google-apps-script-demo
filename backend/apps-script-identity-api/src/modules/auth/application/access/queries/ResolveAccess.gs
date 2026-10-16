// Use case (server-to-server): turn a Google ID token into { email, role } for another backend.
// deps: { users, tokenVerifier }. input: { idToken }. A bad token gets UNAUTHORIZED from the verifier.
Auth.Application.ResolveAccess = {
  execute: function (deps, input) {
    var support = Auth.Application.AccessSupportService;
    var identity = deps.tokenVerifier.verify(input.idToken);
    return support.toAccess(support.requireActiveUser(deps, identity));
  }
};
