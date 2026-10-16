import { describe, expect, it } from 'vitest'
import { WarmupGate } from './warmup-gate'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('WarmupGate', () => {
  it('runs the first call alone and resumes waiters after it succeeds', async () => {
    const gate = new WarmupGate()
    const first = deferred<string>()
    const started: string[] = []
    const firstRun = gate.run('a', () => { started.push('first'); return first.promise })
    const secondRun = gate.run('a', async () => { started.push('second'); return 'second' })
    await flush()
    expect(started).toEqual(['first'])
    first.resolve('first')
    expect(await firstRun).toBe('first')
    expect(await secondRun).toBe('second')
    expect(started).toEqual(['first', 'second'])
  })

  it('resumes waiters after the first call fails and still rejects the first caller', async () => {
    const gate = new WarmupGate()
    const first = deferred<string>()
    const firstRun = gate.run('a', () => first.promise)
    const secondRun = gate.run('a', async () => 'second')
    first.reject(new Error('boom'))
    await expect(firstRun).rejects.toThrow('boom')
    expect(await secondRun).toBe('second')
  })

  it('does not mark the key warm after a failure', async () => {
    const gate = new WarmupGate()
    await gate.run('a', () => Promise.reject(new Error('x'))).catch(() => undefined)
    const retry = deferred<string>()
    const started: string[] = []
    const retryRun = gate.run('a', () => { started.push('retry'); return retry.promise })
    const waiter = gate.run('a', async () => { started.push('waiter'); return 'w' })
    await flush()
    expect(started).toEqual(['retry'])
    retry.resolve('r')
    await Promise.all([retryRun, waiter])
    expect(started).toEqual(['retry', 'waiter'])
  })

  it('runs immediately once the key is warm', async () => {
    const gate = new WarmupGate()
    await gate.run('a', async () => 1)
    const slow = deferred<number>()
    const started: string[] = []
    void gate.run('a', () => { started.push('one'); return slow.promise })
    void gate.run('a', () => { started.push('two'); return slow.promise })
    expect(started).toEqual(['one', 'two'])
  })

  it('treats a new key as cold again', async () => {
    const gate = new WarmupGate()
    await gate.run('a', async () => 1)
    const first = deferred<number>()
    const started: string[] = []
    void gate.run('b', () => { started.push('b1'); return first.promise })
    void gate.run('b', async () => { started.push('b2'); return 2 })
    await flush()
    expect(started).toEqual(['b1'])
    first.resolve(1)
    await flush()
    expect(started).toEqual(['b1', 'b2'])
  })

  it('never gates a null key', () => {
    const gate = new WarmupGate()
    const slow = deferred<number>()
    const started: string[] = []
    void gate.run(null, () => { started.push('one'); return slow.promise })
    void gate.run(null, () => { started.push('two'); return slow.promise })
    expect(started).toEqual(['one', 'two'])
  })
})
