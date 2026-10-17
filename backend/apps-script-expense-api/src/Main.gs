/**
 * Expense API: personal expense tracking (payment methods, fixed expense templates, expenses).
 * Apps Script is only the API layer: JSON in, JSON out.
 *
 * Contract: POST (Content-Type text/plain to avoid a CORS preflight) with
 *   { "idToken": "<Google ID token>", "action": "expense-tracking.expense.list", "payload": { "statement_month": "2026-10" } }
 * Every action needs a Google ID token; the user, role and claims are resolved by identity-api (IDENTITY_API_URL).
 * Reads need the claim permission=expense.read, every other action permission=expense.write (super passes both).
 * Response: { "ok": true, "data": ... } or { "ok": false, "error": { "code": "...", "message": "..." } }
 * Error codes: VALIDATION (domain rules put the stable code in message), NOT_FOUND, UNAUTHORIZED, FORBIDDEN, INTERNAL.
 * doGet returns { service, version } without authentication.
 *
 * Script properties: GOOGLE_CLIENT_ID, IDENTITY_API_URL, SPREADSHEET_ID (the expense spreadsheet).
 * Entry points only: all logic lives in modules/, wired by composition/Composition.gs.
 */

var EXPENSE_SERVICE_NAME = 'expense-api';

function doGet() {
  return ResponseWriter.success({ service: EXPENSE_SERVICE_NAME, version: SystemEndpoints.API_VERSION });
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
    // Authenticate, then authorize, before the action is resolved: nothing is revealed to anonymous callers.
    var access = app.accessResolver.resolve(request.idToken);
    var readOnly = app.router.isReadOnly(request.action);
    if (!SystemEndpoints.isOpenToSignedIn(request.action)) {
      if (readOnly) AccessControl.assertCanRead(access); else AccessControl.assertCanWrite(access);
    }
    // The schema is checked under the lock only when its signature changed; normally this is one property read.
    if (!app.schemaInstaller.isCurrent()) {
      app.lockGuard.runExclusive(function () {
        app.renameLegacyNames();
        app.schemaInstaller.ensureSchema();
      });
    }
    var handler = app.router.resolve(request.action);
    var payload = request.payload && typeof request.payload === 'object' && !Array.isArray(request.payload) ? request.payload : {};
    // The actor is always the verified email, never a payload value.
    var input = { actor: access.email, payload: payload };
    if (readOnly) return ResponseWriter.success(handler(input));
    return ResponseWriter.success(app.lockGuard.runExclusive(function () { return handler(input); }));
  } catch (err) {
    return ResponseWriter.failure(err);
  }
}
