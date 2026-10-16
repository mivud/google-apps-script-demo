// Translates auth domain errors to generic ApiErrors, so callers never learn which rule failed.
// An unreadable email means "not on the allowlist" (FORBIDDEN); a bad nonce means a bad credential (UNAUTHORIZED).
Auth.Endpoints.AuthErrorTranslator = {
  run: function (work) {
    try {
      return work();
    } catch (err) {
      throw Auth.Endpoints.AuthErrorTranslator.translate(err);
    }
  },

  translate: function (err) {
    var codes = Auth.Domain.AuthError;
    if (!codes.is(err)) return err;
    return err.code === codes.INVALID_EMAIL ? ApiError.forbidden() : ApiError.unauthorized();
  }
};
