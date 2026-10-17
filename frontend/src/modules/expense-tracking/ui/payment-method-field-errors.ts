import { ValidationError } from '../../../shared/errors'

const ID_CODES = ['payment_method_id_invalid', 'payment_method_id_taken']
const NAME_CODES = ['payment_method_name_invalid', 'payment_method_name_taken']

// Which form field a payment method error belongs to; other errors show in the dialog footer.
export function fieldOf(error: Error | undefined): 'id' | 'name' | 'closingDay' | 'color' | undefined {
  if (!(error instanceof ValidationError)) return undefined
  if (ID_CODES.includes(error.code)) return 'id'
  if (NAME_CODES.includes(error.code)) return 'name'
  if (error.code === 'payment_method_closing_day_invalid') return 'closingDay'
  if (error.code === 'payment_method_color_invalid') return 'color'
  return undefined
}
