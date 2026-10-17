// Typed domain error with a stable code, shared by the identity modules. The domain never knows API codes;
// DomainErrorTranslator maps these at the edge.
var DomainError = {
  NAME: 'DomainError',

  CODE: {
    ROLE_NAME_INVALID: 'role_name_invalid',
    ROLE_DESCRIPTION_INVALID: 'role_description_invalid',
    CLAIM_KEY_INVALID: 'claim_key_invalid',
    CLAIM_VALUE_INVALID: 'claim_value_invalid',
    USER_EMAIL_INVALID: 'user_email_invalid',
    INVALID_REQUEST: 'invalid_request',
    LIMIT_EXCEEDED: 'limit_exceeded',
    ROLE_PROTECTED: 'role_protected',
    ROLE_IN_USE: 'role_in_use',
    CLAIM_IN_USE: 'claim_in_use',
    CLAIM_UNKNOWN: 'claim_unknown',
    ROLE_NAME_DUPLICATE: 'role_name_duplicate',
    USER_EMAIL_DUPLICATE: 'user_email_duplicate',
    CLAIM_DUPLICATE: 'claim_duplicate',
    LAST_SUPER: 'last_super',
    SELF_LOCKOUT: 'self_lockout',
    CONFLICT: 'conflict',
    NOT_FOUND: 'not_found',
    INVALID_NONCE: 'invalid_nonce',
    NONCE_MISMATCH: 'nonce_mismatch'
  },

  create: function (code) {
    var error = new Error(code);
    error.name = DomainError.NAME;
    error.code = code;
    return error;
  },

  notFound: function (entityLabel, id) {
    var error = DomainError.create(DomainError.CODE.NOT_FOUND);
    error.entityLabel = entityLabel;
    error.id = id;
    return error;
  },

  is: function (error) {
    return !!error && error.name === DomainError.NAME;
  }
};
