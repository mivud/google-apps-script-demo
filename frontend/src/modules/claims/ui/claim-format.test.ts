import { describe, expect, it } from 'vitest'
import { claimLabel, parseClaimLabel, sortClaims } from './claim-format'

describe('claim-format', () => {
  it('round-trips a claim through its label, keeping "=" inside the value', () => {
    const claim = { key: 'team', value: 'a=b' }
    expect(parseClaimLabel(claimLabel(claim))).toEqual(claim)
  })

  it('rejects labels without a key', () => {
    expect(parseClaimLabel('=x')).toBeUndefined()
    expect(parseClaimLabel('nothing')).toBeUndefined()
  })

  it('sorts by key then value', () => {
    const sorted = sortClaims([{ key: 'b', value: '1' }, { key: 'a', value: '3' }, { key: 'a', value: '1' }])
    expect(sorted.map(claimLabel)).toEqual(['a=1', 'a=3', 'b=1'])
  })
})
