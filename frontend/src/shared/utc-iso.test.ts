import { describe, expect, it } from 'vitest'
import { toUtcOffsetIso } from './utc-iso'

describe('toUtcOffsetIso', () => {
  it('replaces the Z suffix with +00:00 and keeps milliseconds', () => {
    expect(toUtcOffsetIso('2026-01-02T03:04:05Z')).toBe('2026-01-02T03:04:05.000+00:00')
  })

  it('converts other offsets to UTC', () => {
    expect(toUtcOffsetIso('2026-01-02T03:04:05+07:00')).toBe('2026-01-01T20:04:05.000+00:00')
  })

  it('accepts Date objects and epoch numbers', () => {
    const date = new Date('2026-05-06T07:08:09.123Z')
    expect(toUtcOffsetIso(date)).toBe('2026-05-06T07:08:09.123+00:00')
    expect(toUtcOffsetIso(date.getTime())).toBe('2026-05-06T07:08:09.123+00:00')
  })

  it('passes unparsable values through unchanged', () => {
    expect(toUtcOffsetIso('not a date')).toBe('not a date')
  })
})
