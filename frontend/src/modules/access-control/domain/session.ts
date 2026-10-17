import type { Claim } from '../../claims'

// Who the backend says the caller is, as returned by the provider adapters.
export interface Identity {
  email: string
  // Primary role name as sent by the backend; may be empty. Not used for permission checks.
  role: string
  // Role names and effective claims, for feature checks such as hasClaim(identity.claims, ...).
  roles: string[]
  claims: Claim[]
}

export interface Session extends Identity {
  idToken: string
  // Epoch milliseconds read from the token for scheduling only, null when unreadable.
  expiresAt: number | null
}
