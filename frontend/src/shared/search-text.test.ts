import { describe, expect, it } from 'vitest'
import { matchSearch, normalizeSearchText } from './search-text'

describe('search text', () => {
  it('ignores case, accents and the Vietnamese d-stroke', () => {
    expect(normalizeSearchText('  Cà Phê ')).toBe('ca phe')
    expect(normalizeSearchText('Điện đài')).toBe('dien dai')
  })

  it('matches any field by substring', () => {
    expect(matchSearch('ca phe', ['Cà phê sáng', 'x'])).toBe(true)
    expect(matchSearch('dien', ['x', 'Điện nước'])).toBe(true)
    expect(matchSearch('tea', ['Cà phê'])).toBe(false)
  })

  it('matches everything for a blank query', () => {
    expect(matchSearch('   ', [])).toBe(true)
    expect(matchSearch('', ['a'])).toBe(true)
  })
})
