// Implements the AccessResolver port declared in the shared kernel Ports.gs ({ resolve(idToken): { email, role, roles, claims: [{ key, value }] } })
// by calling the identity-api Web App.
// deps: { settings, http (UrlFetchApp), store (CacheService script cache), hasher, clock, decodeBase64Url(text): string }.
// identity-api is the only place that verifies the token with Google (it checks audience, issuer, expiry), so this
// client does not verify it again: that would cost a second tokeninfo round trip on every cache miss.
// Fails closed: any problem with the identity service becomes a generic error, never access.
var IdentityClient = function (deps) {
  this.deps = deps;
};

IdentityClient.URL_PROPERTY = 'IDENTITY_API_URL';
IdentityClient.ACTION_RESOLVE = 'auth.access.resolve';
IdentityClient.CACHE_PREFIX = 'access:';
IdentityClient.DENIED_PREFIX = 'denied:';
IdentityClient.CACHE_TTL_SECONDS = 60;
// Refusals are remembered briefly so a flood of invalid tokens cannot turn into a flood of identity-api calls.
IdentityClient.DENIED_TTL_SECONDS = 30;
IdentityClient.TOKEN_MAX_LENGTH = 4096;
IdentityClient.TOKEN_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
IdentityClient.DEPLOYMENT_URL = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
IdentityClient.HTTP_OK = 200;
IdentityClient.MILLIS_PER_SECOND = 1000;

IdentityClient.prototype.resolve = function (idToken) {
  // Cheap boundary checks before any cache or network call. They are only a filter (the signature is not checked
  // here): random well-shaped tokens must not cost identity-api calls or fill the cache with refusals.
  if (!IdentityClient.isPlausible(idToken)) throw ApiError.unauthorized();
  var secondsLeft = this.secondsUntilExpiry(idToken);
  var hash = this.deps.hasher.hex(idToken);
  var denied = this.deps.store.get(IdentityClient.DENIED_PREFIX + hash);
  if (denied) throw IdentityClient.refusal(denied);
  var cached = this.deps.store.get(IdentityClient.CACHE_PREFIX + hash);
  if (cached) return JSON.parse(cached);
  return this.resolveRemotely(idToken, hash, secondsLeft);
};

// Reads audience and expiry from the unverified payload; throws UNAUTHORIZED when they do not fit this app.
IdentityClient.prototype.secondsUntilExpiry = function (idToken) {
  var claims = this.readClaims(idToken);
  var clientId = this.deps.settings.read(ScriptSettings.GOOGLE_CLIENT_ID_KEY);
  var secondsLeft = claims ? (Number(claims.exp) * IdentityClient.MILLIS_PER_SECOND - this.deps.clock.now().getTime()) / IdentityClient.MILLIS_PER_SECOND : 0;
  if (!claims || !clientId || claims.aud !== clientId || !(secondsLeft > 0)) throw ApiError.unauthorized();
  return secondsLeft;
};

IdentityClient.prototype.readClaims = function (idToken) {
  try {
    var claims = JSON.parse(this.deps.decodeBase64Url(idToken.split('.')[1]));
    return claims && typeof claims === 'object' ? claims : null;
  } catch (err) {
    return null;
  }
};

IdentityClient.prototype.resolveRemotely = function (idToken, hash, secondsLeft) {
  try {
    var access = this.fetchAccess(idToken);
    // Never keep the access longer than the token itself is valid.
    var ttl = Math.max(1, Math.floor(Math.min(IdentityClient.CACHE_TTL_SECONDS, secondsLeft)));
    this.deps.store.put(IdentityClient.CACHE_PREFIX + hash, JSON.stringify(access), ttl);
    return access;
  } catch (err) {
    // Only definite refusals are remembered; an unavailable service stays uncached so it can recover at once.
    var code = err instanceof ApiError ? err.code : '';
    if (code === ErrorCode.UNAUTHORIZED || code === ErrorCode.FORBIDDEN) {
      this.deps.store.put(IdentityClient.DENIED_PREFIX + hash, code, IdentityClient.DENIED_TTL_SECONDS);
    }
    throw err;
  }
};

IdentityClient.prototype.fetchAccess = function (idToken) {
  var body = this.callIdentityApi(idToken);
  if (IdentityClient.isValidAccess(body)) {
    return {
      email: body.data.email,
      role: body.data.role,
      roles: body.data.roles.slice(),
      claims: IdentityClient.sanitizeClaims(body.data.claims)
    };
  }
  var code = body && body.error ? body.error.code : '';
  if (code === ErrorCode.UNAUTHORIZED) throw ApiError.unauthorized();
  if (code === ErrorCode.FORBIDDEN) throw ApiError.forbidden();
  throw IdentityClient.unavailable();
};

IdentityClient.prototype.callIdentityApi = function (idToken) {
  var url = this.deps.settings.read(IdentityClient.URL_PROPERTY);
  if (!IdentityClient.isTrustedUrl(url)) throw IdentityClient.unavailable();
  try {
    // text/plain keeps the call a simple request; the token travels in the body, never in the URL.
    var response = this.deps.http.fetch(url, {
      method: 'post',
      contentType: 'text/plain',
      payload: JSON.stringify({ action: IdentityClient.ACTION_RESOLVE, idToken: idToken }),
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== IdentityClient.HTTP_OK) throw IdentityClient.unavailable();
    return JSON.parse(response.getContentText());
  } catch (err) {
    throw IdentityClient.unavailable();
  }
};

// A successful answer must carry email, role and a roles array of strings; anything else counts as unavailable.
IdentityClient.isValidAccess = function (body) {
  if (!body || body.ok !== true || !body.data) return false;
  var data = body.data;
  return typeof data.email === 'string' && typeof data.role === 'string' && Array.isArray(data.roles) &&
    data.roles.every(function (name) { return typeof name === 'string'; });
};

// Keeps only well-formed { key, value } string pairs; anything else is dropped (fails closed).
IdentityClient.sanitizeClaims = function (claims) {
  if (!Array.isArray(claims)) return [];
  return claims.filter(function (claim) {
    return !!claim && typeof claim.key === 'string' && typeof claim.value === 'string';
  }).map(function (claim) { return { key: claim.key, value: claim.value }; });
};

IdentityClient.isPlausible = function (idToken) {
  return typeof idToken === 'string' && idToken.length <= IdentityClient.TOKEN_MAX_LENGTH && IdentityClient.TOKEN_SHAPE.test(idToken);
};

IdentityClient.refusal = function (code) {
  return code === ErrorCode.FORBIDDEN ? ApiError.forbidden() : ApiError.unauthorized();
};

// Pins the call to one Web App deployment: https, script.google.com host, /macros/s/<id>/ path and a final /exec.
// The configured property is the only trusted value; it is checked again here so a bad edit cannot leak tokens.
IdentityClient.isTrustedUrl = function (url) {
  return typeof url === 'string' && IdentityClient.DEPLOYMENT_URL.test(url);
};

// Generic on purpose: callers must not learn why the identity service failed.
IdentityClient.unavailable = function () {
  return new ApiError(ErrorCode.INTERNAL, 'Service unavailable');
};
