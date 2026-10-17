// Value object: the one-time value a client binds to its sign-in. The ID token carries sha256(nonce) in its
// "nonce" claim, so a token minted for another sign-in attempt is refused.
AccessControl.Domain.SessionNonce = {
  SHAPE: /^[A-Za-z0-9_-]{16,128}$/,

  parse: function (raw) {
    if (typeof raw !== 'string' || !AccessControl.Domain.SessionNonce.SHAPE.test(raw)) {
      throw DomainError.create(DomainError.CODE.INVALID_NONCE);
    }
    return raw;
  },

  // A token without a nonce claim is refused: it could be a replayed token minted outside this sign-in flow.
  matchesClaim: function (nonceHash, claim) {
    return typeof claim === 'string' && claim !== '' && claim === nonceHash;
  },

  assertMatchesClaim: function (nonceHash, claim) {
    if (!AccessControl.Domain.SessionNonce.matchesClaim(nonceHash, claim)) {
      throw DomainError.create(DomainError.CODE.NONCE_MISMATCH);
    }
  }
};
