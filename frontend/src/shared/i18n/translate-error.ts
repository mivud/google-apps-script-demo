import { AuthError, ForbiddenError, NetworkError, NotFoundError, ValidationError, type ValidationCode } from '../errors'
import type { MessageKey } from './en'
import type { TranslateFn } from './i18n-context'

// Keyed by stable error codes, so message wording can change without breaking translations.
const VALIDATION_CODE_KEYS: Record<ValidationCode, MessageKey> = {
  name_required: 'error.validation.nameRequired',
  quantity_invalid: 'error.validation.quantityInvalid',
  status_invalid: 'error.validation.statusInvalid',
  maintenance_type_invalid: 'error.validation.maintenanceTypeInvalid',
  date_invalid: 'error.validation.dateInvalid',
  category_name_required: 'error.validation.categoryNameRequired',
  category_name_duplicate: 'error.validation.categoryNameDuplicate',
  category_cycle: 'error.validation.categoryCycle',
  category_depth_exceeded: 'error.validation.categoryDepthExceeded',
  category_in_use: 'error.validation.categoryInUse',
  category_has_children: 'error.validation.categoryHasChildren',
  role_name_invalid: 'error.validation.roleNameInvalid',
  role_description_invalid: 'error.validation.roleDescriptionInvalid',
  role_name_duplicate: 'error.validation.roleNameDuplicate',
  role_protected: 'error.validation.roleProtected',
  role_in_use: 'error.validation.roleInUse',
  claim_key_invalid: 'error.validation.claimKeyInvalid',
  claim_value_invalid: 'error.validation.claimValueInvalid',
  claim_duplicate: 'error.validation.claimDuplicate',
  claim_in_use: 'error.validation.claimInUse',
  claim_unknown: 'error.validation.claimUnknown',
  user_email_invalid: 'error.validation.userEmailInvalid',
  user_email_duplicate: 'error.validation.userEmailDuplicate',
  limit_exceeded: 'error.validation.limitExceeded',
  last_super: 'error.validation.lastSuper',
  self_lockout: 'error.validation.selfLockout',
  conflict: 'error.validation.conflict',
  expense_description_invalid: 'error.validation.expenseDescriptionInvalid',
  expense_amount_invalid: 'error.validation.expenseAmountInvalid',
  expense_amount_required: 'error.validation.expenseAmountRequired',
  expense_date_invalid: 'error.validation.expenseDateInvalid',
  statement_month_invalid: 'error.validation.statementMonthInvalid',
  expense_payment_method_required: 'error.validation.paymentMethodRequired',
  payment_method_not_found: 'error.validation.paymentMethodNotFound',
  payment_method_name_invalid: 'error.validation.paymentMethodNameInvalid',
  payment_method_name_taken: 'error.validation.paymentMethodNameTaken',
  payment_method_id_invalid: 'error.validation.paymentMethodIdInvalid',
  payment_method_id_taken: 'error.validation.paymentMethodIdTaken',
  payment_method_color_invalid: 'error.validation.paymentMethodColorInvalid',
  payment_method_closing_day_invalid: 'error.validation.paymentMethodClosingDayInvalid',
  payment_method_in_use: 'error.validation.paymentMethodInUse',
  payment_day_invalid: 'error.validation.paymentDayInvalid',
  expense_not_fixed: 'error.validation.expenseNotFixed',
  total_months_invalid: 'error.validation.totalMonthsInvalid',
  total_months_below_added: 'error.validation.totalMonthsBelowAdded',
  unknown: 'error.unknown',
}

export function translateError(error: Error, t: TranslateFn): string {
  if (error instanceof ValidationError) return t(VALIDATION_CODE_KEYS[error.code])
  if (error instanceof NotFoundError) return t('error.notFound')
  if (error instanceof AuthError) return t('error.unauthorized')
  if (error instanceof ForbiddenError) return t('error.forbidden')
  if (error instanceof NetworkError) return t('error.network')
  return t('error.unknown')
}
