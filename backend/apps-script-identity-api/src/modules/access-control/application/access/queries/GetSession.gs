// Use case: sign-in of the web client. Like ResolveAccess, but the token must be bound to the client nonce.
// deps: { users, roles, tokenVerifier, hasher }. input: { idToken, nonce }.
AccessControl.Application.GetSession = {
  execute: function (deps, input) {
    var support = AccessControl.Application.AccessSupportService;
    var nonce = AccessControl.Domain.SessionNonce.parse(input.nonce);
    var identity = deps.tokenVerifier.verify(input.idToken);
    AccessControl.Domain.SessionNonce.assertMatchesClaim(deps.hasher.hex(nonce), identity.nonce);
    return support.toAccess(support.requireSignedIn(deps, identity).access);
  }
};
