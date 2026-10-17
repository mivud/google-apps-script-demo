/**
 * Identity API: owns Google ID token verification, the allowlist (`users` sheet) and roles.
 * Apps Script is only the API layer: JSON in, JSON out.
 *
 * Contract: POST (Content-Type text/plain to avoid a CORS preflight) with
 *   { "idToken": "<Google ID token>", "action": "auth.session.get", "payload": { "nonce": "<raw nonce>" } }
 *   { "idToken": "<Google ID token>", "action": "auth.access.resolve" }   (server-to-server)
 * Admin actions (claims.*, roles.*, users.*, access-control.*) are documented in backend/docs; they need identity.read (reads) or identity.write (writes), or the super role.
 * Response: { "ok": true, "data": { "email", "role", "roles", "claims" } } or { "ok": false, "error": { "code", "message" } }
 * Error codes: VALIDATION (domain rules put the stable code in message), NOT_FOUND, UNAUTHORIZED, FORBIDDEN, INTERNAL.
 * doGet returns { service, version } without authentication.
 *
 * Script properties: GOOGLE_CLIENT_ID, SPREADSHEET_ID (the identity spreadsheet, not the equipment one).
 * Entry points only: all logic lives in modules/, wired by composition/Composition.gs.
 */

var IDENTITY_SERVICE_NAME = 'identity-api';

function doGet() {
  return ResponseWriter.success({ service: IDENTITY_SERVICE_NAME, version: SystemEndpoints.API_VERSION });
}

// Run once from the editor after a scope change. doGet never calls UrlFetchApp, so running it does not ask for the
// "Connect to an external service" consent; this call does. Tick every permission box on the consent page.
function authorizeScopes() {
  UrlFetchApp.fetch('https://www.google.com/generate_204', { muteHttpExceptions: true });
  SpreadsheetApp.getActive();
}

function doPost(event) {
  try {
    var request = RequestParser.parse(event);
    var app = Composition.createApp();
    // Unauthenticated callers must not reach the schema lock or sheet writes; the verified result is cached.
    app.tokenVerifier.verify(request.idToken);
    // The schema is checked under the lock only when its signature changed; normally this is one property read.
    if (!app.schemaInstaller.isCurrent()) {
      app.lockGuard.runExclusive(function () { app.schemaInstaller.ensureSchema(); });
    }
    var handler = app.router.resolve(request.action);
    var payload = request.payload && typeof request.payload === 'object' && !Array.isArray(request.payload) ? request.payload : {};
    // The token always comes from the top level, never from the payload.
    var input = { idToken: request.idToken, payload: payload, nonce: payload.nonce };
    if (app.router.isReadOnly(request.action)) return ResponseWriter.success(handler(input));
    // Writes run one at a time; the built-in roles are (re)checked under the same lock.
    return ResponseWriter.success(app.lockGuard.runExclusive(function () {
      app.seedBuiltInRoles();
      return handler(input);
    }));
  } catch (err) {
    return ResponseWriter.failure(err);
  }
}
