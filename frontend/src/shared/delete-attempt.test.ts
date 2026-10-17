import { describe, expect, it } from 'vitest'
import { attemptDelete } from './delete-attempt'

describe('attemptDelete', () => {
  it('returns the deleted item on success', async () => {
    await expect(attemptDelete(async () => undefined, 'u1')).resolves.toEqual({ ok: true, item: 'u1' })
  })

  it('returns the thrown error instead of throwing', async () => {
    const failure = new Error('role_in_use')
    await expect(attemptDelete(async () => { throw failure }, 'r1')).resolves.toEqual({ ok: false, failure })
  })

  it('wraps a non-error rejection', async () => {
    const result = await attemptDelete(() => Promise.reject('boom'), 'x')
    expect(result.ok).toBe(false)
    expect(!result.ok && result.failure.message).toBe('boom')
  })
})
