// Typed domain error with a stable code. The domain never knows API codes; endpoints translate these.
Auth.Domain.AuthError = {
  NAME: 'AuthError',
  INVALID_EMAIL: 'invalid_email',
  INVALID_NONCE: 'invalid_nonce',
  NONCE_MISMATCH: 'nonce_mismatch',

  create: function (code) {
    var error = new Error(code);
    error.name = Auth.Domain.AuthError.NAME;
    error.code = code;
    return error;
  },

  is: function (error) {
    return !!error && error.name === Auth.Domain.AuthError.NAME;
  }
};
