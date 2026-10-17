// Adapters must map provider-specific failures to these so callers see identical semantics.
// Stable `code` values let the UI translate errors without matching message text.
export type ValidationCode =
  | 'name_required'
  | 'quantity_invalid'
  | 'status_invalid'
  | 'maintenance_type_invalid'
  | 'date_invalid'
  | 'category_name_required'
  | 'category_name_duplicate'
  | 'category_cycle'
  | 'category_depth_exceeded'
  | 'category_in_use'
  | 'category_has_children'
  | 'role_name_invalid'
  | 'role_description_invalid'
  | 'role_name_duplicate'
  | 'role_protected'
  | 'role_in_use'
  | 'claim_key_invalid'
  | 'claim_value_invalid'
  | 'claim_duplicate'
  | 'claim_in_use'
  | 'claim_unknown'
  | 'user_email_invalid'
  | 'user_email_duplicate'
  | 'limit_exceeded'
  | 'last_super'
  | 'self_lockout'
  | 'conflict'
  | 'expense_description_invalid'
  | 'expense_amount_invalid'
  | 'expense_amount_required'
  | 'expense_date_invalid'
  | 'statement_month_invalid'
  | 'expense_payment_method_required'
  | 'payment_method_not_found'
  | 'payment_method_name_invalid'
  | 'payment_method_name_taken'
  | 'payment_method_id_invalid'
  | 'payment_method_id_taken'
  | 'payment_method_color_invalid'
  | 'payment_method_closing_day_invalid'
  | 'payment_method_in_use'
  | 'total_months_invalid'
  | 'total_months_below_added'
  | 'unknown'

export class NotFoundError extends Error {
  readonly code = 'not_found'
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  readonly code: ValidationCode
  constructor(message = 'Invalid input', code: ValidationCode = 'unknown') {
    super(message)
    this.name = 'ValidationError'
    this.code = code
  }
}

export class AuthError extends Error {
  readonly code = 'unauthorized'
  constructor(message = 'Not authorized') {
    super(message)
    this.name = 'AuthError'
  }
}

// Signed in but not allowed (not on the allowlist or role too low), unlike AuthError (no valid login).
export class ForbiddenError extends Error {
  readonly code = 'forbidden'
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NetworkError extends Error {
  readonly code = 'network'
  constructor(message = 'Network request failed') {
    super(message)
    this.name = 'NetworkError'
  }
}
