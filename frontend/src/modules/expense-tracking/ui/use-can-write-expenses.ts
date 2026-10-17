import { useHasPermission } from '../../access-control'
import { EXPENSE_WRITE_PERMISSION } from '../permissions'

export function useCanWriteExpenses(): boolean {
  return useHasPermission(EXPENSE_WRITE_PERMISSION)
}
