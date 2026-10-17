// Translates domain errors to ApiErrors. Domain failures travel as VALIDATION with the stable code as message
// (same precedent as the device-management category_in_use); bad sign-in credentials stay generic.
var DomainErrorTranslator = {
  run: function (work) {
    try {
      return work();
    } catch (err) {
      throw DomainErrorTranslator.translate(err);
    }
  },

  translate: function (err) {
    if (!DomainError.is(err)) return err;
    var codes = DomainError.CODE;
    if (err.code === codes.NOT_FOUND) return ApiError.notFound(err.entityLabel, err.id);
    if (err.code === codes.INVALID_NONCE || err.code === codes.NONCE_MISMATCH) return ApiError.unauthorized();
    return ApiError.validation(err.code);
  }
};
