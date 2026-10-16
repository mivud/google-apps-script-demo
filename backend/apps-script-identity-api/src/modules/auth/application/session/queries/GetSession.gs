// Use case: sign-in of the web client. Like ResolveAccess, but the token must be bound to the client nonce.
// deps: { users, tokenVerifier, hasher }. input: { idToken, nonce }.
Auth.Application.GetSession = {
  execute: function (deps, input) {
    var support = Auth.Application.AccessSupportService;
    var nonce = Auth.Domain.SessionNonce.parse(input.nonce);
    var identity = deps.tokenVerifier.verify(input.idToken);
    Auth.Domain.SessionNonce.assertMatchesClaim(deps.hasher.hex(nonce), identity.nonce);
    return support.toAccess(support.requireActiveUser(deps, identity));
  }
};
