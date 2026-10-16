// Value object: an email compared case-insensitively. Always built through Email.of, so a value is already normalized.
Auth.Domain.Email = {
  MAX_LENGTH: 254,
  SHAPE: /^[^\s@]+@[^\s@]+$/,

  // Lenient normalization for stored data; never throws.
  normalize: function (raw) {
    return String(raw === null || raw === undefined ? '' : raw).trim().toLowerCase();
  },

  // Strict creation for input; a value that is not an email never matches a user.
  of: function (raw) {
    var email = Auth.Domain.Email;
    var value = email.normalize(raw);
    if (value.length > email.MAX_LENGTH || !email.SHAPE.test(value)) throw Auth.Domain.AuthError.create(Auth.Domain.AuthError.INVALID_EMAIL);
    return value;
  }
};
