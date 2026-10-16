/**
 * Equipment API. Apps Script is only the API layer: JSON in, JSON out.
 *
 * Contract: POST (Content-Type text/plain to avoid a CORS preflight) with
 *   { "token": "...", "action": "device-management.equipment.list", "payload": { ... } }
 * Response: { "ok": true, "data": ... } or { "ok": false, "error": { "code": "...", "message": "..." } }
 * Version: { "action": "system.version.get" } returns { "version": "1.0.0-beta.N" }; doGet returns it too.
 * Error codes: NOT_FOUND, VALIDATION, UNAUTHORIZED, INTERNAL.
 *
 * Script properties: API_TOKEN (shared secret), SPREADSHEET_ID (optional if the script is bound to the sheet).
 * Entry points only: all logic lives in shared/ and modules/, wired by composition/Composition.gs.
 */

var API_SERVICE_NAME = 'equipment-api';

function doGet() {
  return ResponseWriter.success({ service: API_SERVICE_NAME, version: SystemEndpoints.API_VERSION });
}

function doPost(event) {
  try {
    var request = RequestParser.parse(event);
    var app = Composition.createApp();
    app.tokenGuard.assertValid(request.token);
    var handler = app.router.resolve(request.action);
    var payload = request.payload || {};
    // The schema is checked under the lock only when its signature changed; normally this is one property read.
    if (!app.schemaInstaller.isCurrent()) {
      app.lockGuard.runExclusive(function () { app.schemaInstaller.ensureSchema(); });
    }
    // Reads skip the lock so they never queue behind each other or behind a write.
    var data = app.router.isReadOnly(request.action)
      ? handler(payload)
      : app.lockGuard.runExclusive(function () { return handler(payload); });
    return ResponseWriter.success(data);
  } catch (err) {
    return ResponseWriter.failure(err);
  }
}
