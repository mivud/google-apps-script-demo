import { toSharedApiError, type ApiFailure } from '../../../../../shared/api/apps-script-api'
import { NotFoundError, ValidationError, type ValidationCode } from '../../../../../shared/errors'

// The backend sends lowercase English messages; mapping them here keeps the same codes as the services.
const BACKEND_VALIDATION_CODES: Record<string, ValidationCode> = {
  'name is required': 'name_required',
  'quantity must be an integer >= 0': 'quantity_invalid',
  'invalid status': 'status_invalid',
  'invalid maintenance type': 'maintenance_type_invalid',
  'invalid date': 'date_invalid',
  'category_name_required': 'category_name_required',
  'category_name_duplicate': 'category_name_duplicate',
  'category_cycle': 'category_cycle',
  'category_in_use': 'category_in_use',
  'category_has_children': 'category_has_children',
}

export function toDataError(failure: ApiFailure): Error {
  switch (failure.error.code) {
    case 'NOT_FOUND':
      return new NotFoundError()
    case 'VALIDATION': {
      const code = BACKEND_VALIDATION_CODES[failure.error.message.trim().toLowerCase()] ?? 'unknown'
      return new ValidationError(undefined, code)
    }
    default:
      return toSharedApiError(failure)
  }
}
