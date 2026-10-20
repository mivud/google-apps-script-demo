import { toSharedApiError, type ApiFailure } from '../../../../../shared/api/apps-script-api'
import { NotFoundError, ValidationError, type ValidationCode } from '../../../../../shared/errors'

// Same messages the Apps Script backend and the Postgres triggers raise, so every provider reports identical codes.
const VALIDATION_MESSAGES: Record<string, ValidationCode> = {
  'name is required': 'name_required',
  'quantity must be an integer >= 0': 'quantity_invalid',
  'invalid status': 'status_invalid',
  'invalid maintenance type': 'maintenance_type_invalid',
  'invalid date': 'date_invalid',
  category_name_required: 'category_name_required',
  category_name_duplicate: 'category_name_duplicate',
  category_cycle: 'category_cycle',
  category_depth_exceeded: 'category_depth_exceeded',
  category_in_use: 'category_in_use',
  category_has_children: 'category_has_children',
  purchase_date_invalid: 'purchase_date_invalid',
  warranty_months_invalid: 'warranty_months_invalid',
  warranty_requires_purchase_date: 'warranty_requires_purchase_date',
  note_too_long: 'note_too_long',
  vendor_too_long: 'vendor_too_long',
}

export function toFirebaseDataError(failure: ApiFailure): Error {
  switch (failure.error.code) {
    case 'NOT_FOUND':
      return new NotFoundError()
    case 'VALIDATION':
      return new ValidationError(undefined, VALIDATION_MESSAGES[failure.error.message.trim().toLowerCase()] ?? 'unknown')
    default:
      return toSharedApiError(failure)
  }
}
