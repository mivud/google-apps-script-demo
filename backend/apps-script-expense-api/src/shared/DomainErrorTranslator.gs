// Translates domain errors to ApiErrors. Domain failures travel as VALIDATION with the stable code as message.
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
    if (err.code === DomainError.CODE.NOT_FOUND) return ApiError.notFound(err.entityLabel, err.id);
    return ApiError.validation(err.code);
  }
};
