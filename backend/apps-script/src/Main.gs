/**
 * Equipment API. Apps Script is only the API layer: JSON in, JSON out.
 *
 * Contract: POST (Content-Type text/plain to avoid a CORS preflight) with
 *   { "idToken": "<Google ID token>", "action": "device-management.equipment.list", "payload": { ... } }
 * Every action needs a Google ID token; the user and role are resolved by identity-api (IDENTITY_API_URL).
 * Reads work for admin and viewer; every other action needs admin.
 * Response: { "ok": true, "data": ... } or { "ok": false, "error": { "code": "...", "message": "..." } }
 * Version: doGet returns { service, version } without authentication.
 * Error codes: NOT_FOUND, VALIDATION, UNAUTHORIZED, FORBIDDEN, INTERNAL.
 *
 * Script properties: GOOGLE_CLIENT_ID (OAuth client id the token must be issued for),
 * IDENTITY_API_URL (identity-api Web App), SPREADSHEET_ID (optional if the script is bound to the sheet).
 * Entry points only: all logic lives in shared/ and modules/, wired by composition/Composition.gs.
 */

var API_SERVICE_NAME = 'equipment-api';

function doGet() {
  return ResponseWriter.success({ service: API_SERVICE_NAME, version: SystemEndpoints.API_VERSION });
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
    // Authenticate, then authorize, before the action is even resolved: nothing is revealed to anonymous callers.
    // identity-api verifies the token and says who the user is and which role they have (answer cached about 60 s).
    var access = app.accessResolver.resolve(request.idToken);
    app.currentUser.signIn(access.email);
    var readOnly = app.router.isReadOnly(request.action);
    if (readOnly) AccessControl.assertCanRead(access.role); else AccessControl.assertCanWrite(access.role);
    // The schema is checked under the lock only when its signature changed; normally this is one property read.
    if (!app.schemaInstaller.isCurrent()) {
      app.lockGuard.runExclusive(function () { app.schemaInstaller.ensureSchema(); });
    }
    var handler = app.router.resolve(request.action);
    var payload = request.payload || {};
    // Reads skip the lock so they never queue behind each other or behind a write.
    var data = readOnly
      ? handler(payload)
      : app.lockGuard.runExclusive(function () { return handler(payload); });
    return ResponseWriter.success(data);
  } catch (err) {
    return ResponseWriter.failure(err);
  }
}
