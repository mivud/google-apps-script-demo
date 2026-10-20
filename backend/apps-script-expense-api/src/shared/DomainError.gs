// Typed domain error with a stable code. The domain never knows API codes; DomainErrorTranslator maps these at the edge.
var DomainError = {
  NAME: 'DomainError',

  CODE: {
    INVALID_REQUEST: 'invalid_request',
    PAYMENT_METHOD_ID_INVALID: 'payment_method_id_invalid',
    PAYMENT_METHOD_ID_TAKEN: 'payment_method_id_taken',
    PAYMENT_METHOD_COLOR_INVALID: 'payment_method_color_invalid',
    PAYMENT_METHOD_NAME_INVALID: 'payment_method_name_invalid',
    PAYMENT_METHOD_NAME_TAKEN: 'payment_method_name_taken',
    PAYMENT_METHOD_IN_USE: 'payment_method_in_use',
    PAYMENT_METHOD_NOT_FOUND: 'payment_method_not_found',
    DESCRIPTION_INVALID: 'description_invalid',
    AMOUNT_INVALID: 'amount_invalid',
    EXPENSE_AMOUNT_REQUIRED: 'expense_amount_required',
    EXPENSE_PAYMENT_METHOD_REQUIRED: 'expense_payment_method_required',
    PAYMENT_METHOD_CLOSING_DAY_INVALID: 'payment_method_closing_day_invalid',
    TOTAL_MONTHS_INVALID: 'total_months_invalid',
    TOTAL_MONTHS_BELOW_ADDED: 'total_months_below_added',
    PAYMENT_DAY_INVALID: 'payment_day_invalid',
    EXPENSE_NOT_FIXED: 'expense_not_fixed',
    SPENT_ON_INVALID: 'spent_on_invalid',
    STATEMENT_MONTH_INVALID: 'statement_month_invalid',
    CONFLICT: 'conflict',
    NOT_FOUND: 'not_found'
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
