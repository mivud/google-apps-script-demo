/**
 * Equipment API. Apps Script is only the API layer: JSON in, JSON out.
 *
 * Contract: POST (Content-Type text/plain to avoid a CORS preflight) with
 *   { "token": "...", "action": "device-management.equipment.list", "payload": { ... } }
 * Response: { "ok": true, "data": ... } or { "ok": false, "error": { "code": "...", "message": "..." } }
 * Error codes: NOT_FOUND, VALIDATION, UNAUTHORIZED, INTERNAL.
 *
 * Script properties: API_TOKEN (shared secret), SPREADSHEET_ID (optional if the script is bound to the sheet).
 * Entry points only: all logic lives in shared/ and modules/, wired by composition/Composition.gs.
 */

var API_SERVICE_NAME = 'equipment-api';

function doGet() {
  return ResponseWriter.success({ service: API_SERVICE_NAME });
}

function doPost(event) {
  try {
    var request = RequestParser.parse(event);
    var app = Composition.createApp();
    app.tokenGuard.assertValid(request.token);
    var handler = app.router.resolve(request.action);
    var data = app.lockGuard.runExclusive(function () {
      app.schemaInstaller.ensureSchema();
      return handler(request.payload || {});
    });
    return ResponseWriter.success(data);
  } catch (err) {
    return ResponseWriter.failure(err);
  }
}
