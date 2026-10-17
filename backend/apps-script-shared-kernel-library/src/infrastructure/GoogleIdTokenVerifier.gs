var GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
var GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
var ID_TOKEN_MAX_LENGTH = 4096;
var ID_TOKEN_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
// Short on purpose: it bounds how long a revoked or disabled sign-in keeps working (see docs/auth.md).
var VERIFIED_TOKEN_MAX_CACHE_SECONDS = 60;
var REJECTED_TOKEN_CACHE_SECONDS = 30;
var HTTP_OK = 200;
var MILLIS_PER_SECOND = 1000;

// TokenVerifier port backed by Google's tokeninfo endpoint.
// deps: { settings, clock, cache (CacheVerifiedTokens), http (the app's UrlFetchApp) }
// Every refusal throws the same ApiError.unauthorized(); tokens and emails are never logged.
function GoogleIdTokenVerifier(deps) {
  this.deps = deps;
}

GoogleIdTokenVerifier.prototype.verify = function (idToken) {
  if (!GoogleIdTokenVerifier.isPlausible(idToken)) throw ApiError.unauthorized();
  var cached = this.deps.cache.get(idToken);
  if (cached) return cached;
  if (this.deps.cache.isRejected(idToken)) throw ApiError.unauthorized();
  return this.verifyWithGoogle(idToken);
};

// Remembers refusals briefly; network failures are not ApiErrors and stay uncached so they can be retried.
GoogleIdTokenVerifier.prototype.verifyWithGoogle = function (idToken) {
  try {
    return this.fetchIdentity(idToken);
  } catch (err) {
    if (err instanceof ApiError) this.deps.cache.putRejected(idToken, REJECTED_TOKEN_CACHE_SECONDS);
    throw err;
  }
};

GoogleIdTokenVerifier.prototype.fetchIdentity = function (idToken) {
  var claims = this.fetchClaims(idToken);
  var expiresAtMs = this.assertClaims(claims);
  // nonce is the raw claim ("" when the token carries none); callers decide whether they require it.
  var identity = { email: claims.email, nonce: typeof claims.nonce === 'string' ? claims.nonce : '' };
  var remainingSeconds = (expiresAtMs - this.deps.clock.now().getTime()) / MILLIS_PER_SECOND;
  this.deps.cache.put(idToken, identity, Math.min(remainingSeconds, VERIFIED_TOKEN_MAX_CACHE_SECONDS));
  return identity;
};

// Cheap boundary check before any network call.
GoogleIdTokenVerifier.isPlausible = function (idToken) {
  return typeof idToken === 'string' && idToken.length <= ID_TOKEN_MAX_LENGTH && ID_TOKEN_SHAPE.test(idToken);
};

// The token goes in a POST form body, never in a URL that could end up in logs.
GoogleIdTokenVerifier.prototype.fetchClaims = function (idToken) {
  var response = this.deps.http.fetch(GOOGLE_TOKENINFO_URL, {
    method: 'post',
    payload: { id_token: idToken },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== HTTP_OK) throw ApiError.unauthorized();
  try {
    return JSON.parse(response.getContentText());
  } catch (err) {
    throw ApiError.unauthorized();
  }
};

// Returns the expiry in epoch milliseconds when all claims are acceptable.
GoogleIdTokenVerifier.prototype.assertClaims = function (claims) {
  if (!claims || typeof claims !== 'object') throw ApiError.unauthorized();
  var clientId = this.deps.settings.read(ScriptSettings.GOOGLE_CLIENT_ID_KEY);
  var expiresAtMs = Number(claims.exp) * MILLIS_PER_SECOND;
  var valid = !!clientId
    && claims.aud === clientId
    && GOOGLE_ISSUERS.indexOf(claims.iss) !== -1
    && String(claims.email_verified) === 'true'
    && typeof claims.email === 'string' && claims.email !== ''
    && expiresAtMs > this.deps.clock.now().getTime();
  if (!valid) throw ApiError.unauthorized();
  return expiresAtMs;
};
