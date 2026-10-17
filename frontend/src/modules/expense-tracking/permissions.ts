// Re-exports the shared claim key so callers keep one import; stays light so the launcher registry can import it without pulling the module into the main bundle.
export { PERMISSION_CLAIM_KEY } from '../access-control'
export const EXPENSE_READ_PERMISSION = 'expense.read'
export const EXPENSE_WRITE_PERMISSION = 'expense.write'
