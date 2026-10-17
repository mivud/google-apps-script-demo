// Value object: an email compared case-insensitively. Always built through Email.of, so a value is already normalized.
Users.Domain.Email = {
  MAX_LENGTH: 254,
  SHAPE: /^[^\s@]+@[^\s@]+$/,
  CONTROL_CHARACTERS: /[\u0000-\u001f\u007f-\u009f]/,

  // Lenient normalization for stored data; never throws.
  normalize: function (raw) {
    return String(raw === null || raw === undefined ? '' : raw).trim().toLowerCase();
  },

  // Strict creation for input.
  of: function (raw) {
    var email = Users.Domain.Email;
    var value = email.normalize(raw);
    // Leading = + - @ stays allowed: cells are written as text, so there is no formula injection.
    var invalid = value.length > email.MAX_LENGTH || email.CONTROL_CHARACTERS.test(value) || !email.SHAPE.test(value);
    if (invalid) throw DomainError.create(DomainError.CODE.USER_EMAIL_INVALID);
    return value;
  }
};
