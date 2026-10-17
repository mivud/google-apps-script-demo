import { RedirectLoginError } from '../domain/redirect-callback'

export interface PendingRedirect {
  state: string
  rawNonce: string
  expiresAt: number
}

const STORAGE_KEY = 'auth.redirect.pending'
export const PENDING_TTL_MS = 10 * 60 * 1000

// sessionStorage (not localStorage): it dies with the tab and holds only one-shot values, never a token.
function resolve(storage?: Storage): Storage {
  return storage ?? window.sessionStorage
}

function isPending(value: unknown): value is PendingRedirect {
  const item = value as Partial<PendingRedirect> | null
  return typeof item?.state === 'string' && typeof item.rawNonce === 'string' && typeof item.expiresAt === 'number'
}

export function savePending(state: string, rawNonce: string, now = Date.now(), storage?: Storage): void {
  const pending: PendingRedirect = { state, rawNonce, expiresAt: now + PENDING_TTL_MS }
  try {
    resolve(storage).setItem(STORAGE_KEY, JSON.stringify(pending))
  } catch {
    throw new RedirectLoginError('unavailable')
  }
}

// One-shot: the entry is deleted as it is read, so a callback can never be replayed.
export function takePending(storage?: Storage): PendingRedirect | null {
  try {
    const store = resolve(storage)
    const raw = store.getItem(STORAGE_KEY)
    store.removeItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return isPending(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function clearPending(storage?: Storage): void {
  try {
    resolve(storage).removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: nothing was stored.
  }
}
