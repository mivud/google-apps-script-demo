var TOKEN_CACHE_KEY_PREFIX = 'idtoken:';
var REJECTED_TOKEN_KEY_PREFIX = 'idtoken-rejected:';
var REJECTED_TOKEN_MARKER = '1';

// Short-lived cache of verified identities, so one sign-in does not call Google on every request.
// store must be the calling app's CacheService.getScriptCache(). The key is the SHA-256 of the token:
// the raw token is never stored. It is only an accelerator: a miss means a normal verification.
// Rejected tokens are remembered too, so a flood of bad tokens cannot burn the UrlFetch quota.
function CacheVerifiedTokens(store) {
  this.store = store;
  this.hasher = new Sha256Hasher();
}

CacheVerifiedTokens.prototype.keyFor = function (idToken) {
  return TOKEN_CACHE_KEY_PREFIX + this.hasher.hex(idToken);
};

CacheVerifiedTokens.prototype.get = function (idToken) {
  var raw = this.store.get(this.keyFor(idToken));
  return raw ? JSON.parse(raw) : null;
};

CacheVerifiedTokens.prototype.put = function (idToken, identity, ttlSeconds) {
  if (ttlSeconds < 1) return;
  this.store.put(this.keyFor(idToken), JSON.stringify(identity), Math.floor(ttlSeconds));
};

CacheVerifiedTokens.prototype.isRejected = function (idToken) {
  return this.store.get(REJECTED_TOKEN_KEY_PREFIX + this.hasher.hex(idToken)) === REJECTED_TOKEN_MARKER;
};

CacheVerifiedTokens.prototype.putRejected = function (idToken, ttlSeconds) {
  this.store.put(REJECTED_TOKEN_KEY_PREFIX + this.hasher.hex(idToken), REJECTED_TOKEN_MARKER, ttlSeconds);
};
