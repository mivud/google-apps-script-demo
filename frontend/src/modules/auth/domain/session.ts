import type { Role } from './role'

// Who the backend says the caller is, as returned by the provider adapters.
export interface Identity {
  email: string
  role: Role
}

export interface Session extends Identity {
  idToken: string
  // Epoch milliseconds read from the token for scheduling only, null when unreadable.
  expiresAt: number | null
}
