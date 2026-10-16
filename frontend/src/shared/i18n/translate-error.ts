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
