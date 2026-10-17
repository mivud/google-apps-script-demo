import { hasClaim, useSession } from '../../access-control'
import { EXPENSE_WRITE_PERMISSION, PERMISSION_CLAIM_KEY } from '../permissions'

const SUPER_ROLE = 'super'
const ADMIN_ROLE = 'admin'

// UI convenience only; the backend (and RLS) enforce the real permission.
export function useCanWriteExpenses(): boolean {
  const session = useSession()
  if (!session) return false
  return session.role === ADMIN_ROLE || session.roles.includes(SUPER_ROLE) || hasClaim(session.claims, PERMISSION_CLAIM_KEY, EXPENSE_WRITE_PERMISSION)
}
