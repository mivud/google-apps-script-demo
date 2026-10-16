// Builds the { ok, data, error } envelope as a JSON ContentService output.
var ResponseWriter = {
  success: function (data) {
    return ResponseWriter.write({ ok: true, data: data });
  },

  failure: function (err) {
    var error = err instanceof ApiError
      ? { code: err.code, message: err.message }
      : { code: ErrorCode.INTERNAL, message: String(err && err.message ? err.message : err) };
    return ResponseWriter.write({ ok: false, error: error });
  },

  write: function (body) {
    return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
  }
};
