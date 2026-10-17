import type { Session } from '../domain/session'

type Listener = (session: Session | null) => void

// In-memory only on purpose: the ID token must never reach web storage.
export class SessionStore {
  private session: Session | null = null
  private readonly listeners = new Set<Listener>()

  get(): Session | null {
    return this.session
  }

  set(session: Session | null): void {
    this.session = session
    this.listeners.forEach((listener) => listener(session))
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
