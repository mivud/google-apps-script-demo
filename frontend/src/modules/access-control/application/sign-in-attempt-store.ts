export type SignInAttempt = { status: 'idle' | 'pending' } | { status: 'failed'; error: Error }

// The credential callback swallows errors, so the login screen reads the outcome here.
export class SignInAttemptStore {
  private state: SignInAttempt = { status: 'idle' }
  private readonly listeners = new Set<() => void>()

  get(): SignInAttempt {
    return this.state
  }

  set(state: SignInAttempt): void {
    this.state = state
    this.listeners.forEach((listener) => listener())
  }

  clear(): void {
    this.set({ status: 'idle' })
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
