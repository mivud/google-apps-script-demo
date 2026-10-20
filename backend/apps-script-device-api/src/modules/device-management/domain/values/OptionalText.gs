// Pure value object for nullable free text: blank -> null, ends trimmed, inner newlines kept.
DeviceManagement.Domain.OptionalText = {
  MUST_BE_STRING_SUFFIX: ' must be a string',

  // limit: { max, code }; code is the stable error code used when the text is too long.
  // Returns the normalized string or null; throws a validation error for non-strings or overlong text.
  normalize: function (value, field, limit) {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') throw ApiError.validation(field + DeviceManagement.Domain.OptionalText.MUST_BE_STRING_SUFFIX);
    var trimmed = value.trim();
    if (trimmed === '') return null;
    if (trimmed.length > limit.max) throw ApiError.validation(limit.code);
    return trimmed;
  },

  // Sheet cells read back as '' when empty.
  fromStored: function (value) {
    return value === undefined || value === null || value === '' ? null : value;
  }
};
