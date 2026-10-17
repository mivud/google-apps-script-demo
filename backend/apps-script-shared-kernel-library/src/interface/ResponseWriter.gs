// Builds the { ok, data, error } envelope as a JSON ContentService output.
var ResponseWriter = {
  success: function (data) {
    return ResponseWriter.write({ ok: true, data: data });
  },

  // Only ApiError messages are written for clients; anything else may expose internals, so it is logged masked
  // server-side (name and message only, never request data) and answered with a fixed generic message.
  failure: function (err) {
    if (err instanceof ApiError) {
      return ResponseWriter.write({ ok: false, error: { code: err.code, message: err.message } });
    }
    console.error(LogSafeText.of((err && err.name ? err.name : 'Error') + ': ' + (err && err.message ? err.message : '')));
    return ResponseWriter.write({ ok: false, error: { code: ErrorCode.INTERNAL, message: ResponseWriter.INTERNAL_MESSAGE } });
  },

  INTERNAL_MESSAGE: 'Internal error',

  write: function (body) {
    return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
  }
};
