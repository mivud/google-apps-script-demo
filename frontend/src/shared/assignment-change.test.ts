import { describe, expect, it, vi } from 'vitest'
import { applyAssignmentChange, diffAssignment, hasChanges } from './assignment-change'

describe('diffAssignment', () => {
  it('returns nothing when the checks match the saved assignment', () => {
    const change = diffAssignment(['a', 'b', 'c'], ['a', 'c'], new Set(['a', 'c']))
    expect(change).toEqual({ added: [], removed: [] })
    expect(hasChanges(change)).toBe(false)
  })

  it('splits newly checked and newly unchecked ids in option order', () => {
    const change = diffAssignment(['a', 'b', 'c', 'd'], ['a', 'c'], new Set(['b', 'c', 'd']))
    expect(change).toEqual({ added: ['b', 'd'], removed: ['a'] })
    expect(hasChanges(change)).toBe(true)
  })

  it('keeps an assigned id that is missing from the options out of the change', () => {
    expect(diffAssignment(['a'], ['gone'], new Set(['a']))).toEqual({ added: ['a'], removed: [] })
  })
})

describe('applyAssignmentChange', () => {
  it('adds before it removes and then reports done', async () => {
    const calls: string[] = []
    await applyAssignmentChange(
      { added: ['n1', 'n2'], removed: ['o1'] },
      async (id) => { calls.push(`add:${id}`) },
      async (id) => { calls.push(`remove:${id}`) },
      () => calls.push('done'),
    )
    expect(calls).toEqual(['add:n1', 'add:n2', 'remove:o1', 'done'])
  })

  it('stops at the first failure, rethrows it and still reports done', async () => {
    const remove = vi.fn()
    const onDone = vi.fn()
    const add = vi.fn().mockRejectedValue(new Error('last_admin'))
    await expect(applyAssignmentChange({ added: ['x'], removed: ['y'] }, add, remove, onDone)).rejects.toThrow('last_admin')
    expect(remove).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledOnce()
  })
})
