import { useSyncExternalStore } from 'react'
import { canWrite, type Role } from '../domain/role'
import type { Session } from '../domain/session'
import { useAuth } from './auth-context'

export function useSession(): Session | null {
  const auth = useAuth()
  return useSyncExternalStore(
    (listener) => auth.subscribe(listener),
    () => auth.current(),
  )
}

export function useRole(): Role | null {
  return useSession()?.role ?? null
}

// UI convenience only; the backend enforces the real permission.
export function useCanWrite(): boolean {
  const role = useRole()
  return role !== null && canWrite(role)
}
