import { useSyncExternalStore } from 'react'
import { hasPermission } from '../domain/permission'
import type { Session } from '../domain/session'
import { useAuth } from './auth-context'

export function useSession(): Session | null {
  const auth = useAuth()
  return useSyncExternalStore(
    (listener) => auth.subscribe(listener),
    () => auth.current(),
  )
}

// UI convenience only; the backend enforces the real permission.
export function useHasPermission(permission: string): boolean {
  const session = useSession()
  return session !== null && hasPermission(session, permission)
}
