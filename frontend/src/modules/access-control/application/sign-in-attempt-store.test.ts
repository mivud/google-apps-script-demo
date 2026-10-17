import { describe, expect, it, vi } from 'vitest'
import { SignInAttemptStore } from './sign-in-attempt-store'

describe('SignInAttemptStore', () => {
  it('starts idle and notifies on set and clear', () => {
    const store = new SignInAttemptStore()
    const listener = vi.fn()
    store.subscribe(listener)
    expect(store.get()).toEqual({ status: 'idle' })
    store.set({ status: 'pending' })
    expect(store.get()).toEqual({ status: 'pending' })
    store.clear()
    expect(store.get()).toEqual({ status: 'idle' })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('stops notifying after unsubscribe', () => {
    const store = new SignInAttemptStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    unsubscribe()
    store.set({ status: 'pending' })
    expect(listener).not.toHaveBeenCalled()
  })
})
