// Business error with a stable code. A constructor function (not a class) so `instanceof` works across files.
function ApiError(code, message) {
  this.code = code;
  this.message = message;
}

ApiError.validation = function (message) {
  return new ApiError(ErrorCode.VALIDATION, message);
};

ApiError.notFound = function (entityLabel, id) {
  return new ApiError(ErrorCode.NOT_FOUND, entityLabel + ' ' + id + ' not found');
};

// One message for every authentication failure, so callers cannot tell why a token was refused.
ApiError.unauthorized = function () {
  return new ApiError(ErrorCode.UNAUTHORIZED, 'Invalid token');
};

// One message for every authorization failure (unknown user, inactive user, missing permission).
ApiError.forbidden = function () {
  return new ApiError(ErrorCode.FORBIDDEN, 'Access denied');
};
