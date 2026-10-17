// Value object: a (key, value) pair granted to roles or users. Compared by value, validated on creation.
Claims.Domain.Claim = {
  KEY_SHAPE: /^[a-z][a-z0-9_.:-]{0,63}$/,
  VALUE_MAX_LENGTH: 200,
  MAX_CLAIMS: 1000,

  assertCanCreate: function (existingCount) {
    if (existingCount >= Claims.Domain.Claim.MAX_CLAIMS) throw DomainError.create(DomainError.CODE.LIMIT_EXCEEDED);
  },
  CONTROL_CHARACTERS: /[\u0000-\u001f\u007f-\u009f]/,

  of: function (key, value) {
    var claim = Claims.Domain.Claim;
    if (typeof key !== 'string' || !claim.KEY_SHAPE.test(key)) throw DomainError.create(DomainError.CODE.CLAIM_KEY_INVALID);
    var valid = typeof value === 'string' && value.length >= 1 && value.length <= claim.VALUE_MAX_LENGTH &&
      !claim.CONTROL_CHARACTERS.test(value);
    if (!valid) throw DomainError.create(DomainError.CODE.CLAIM_VALUE_INVALID);
    return { key: key, value: value };
  }
};
