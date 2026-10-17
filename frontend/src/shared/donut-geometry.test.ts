import { describe, expect, it } from 'vitest'
import { FULL_TURN, ringSlicePath, sliceAngles } from './donut-geometry'

const span = (angles: { start: number; end: number }) => angles.end - angles.start

describe('sliceAngles', () => {
  it('returns nothing without a positive total', () => {
    expect(sliceAngles([])).toEqual([])
    expect(sliceAngles([0, 0])).toEqual([])
    expect(sliceAngles([-5])).toEqual([])
  })

  it('splits proportionally, starting at 12 o clock, in the given order', () => {
    const [a, b] = sliceAngles([1, 3])
    expect(a.start).toBeCloseTo(-Math.PI / 2)
    expect(span(a)).toBeCloseTo(FULL_TURN / 4)
    expect(b.start).toBeCloseTo(a.end)
    expect(b.end).toBeCloseTo(-Math.PI / 2 + FULL_TURN)
  })

  it('widens a tiny slice and shrinks the others so the ring still closes', () => {
    const slices = sliceAngles([1, 10000])
    expect(span(slices[0])).toBeCloseTo((2 * Math.PI) / 180)
    expect(slices[1].end).toBeCloseTo(-Math.PI / 2 + FULL_TURN)
  })

  it('gives empty slices no width', () => {
    expect(span(sliceAngles([0, 5])[0])).toBe(0)
  })
})

describe('ringSlicePath', () => {
  it('draws a partial slice as one closed arc path', () => {
    const path = ringSlicePath(50, 50, 40, 20, { start: 0, end: Math.PI / 2 })
    expect(path.startsWith('M ')).toBe(true)
    expect(path.endsWith('Z')).toBe(true)
    expect(path).toContain('A 40 40 0 0 1')
  })

  it('uses the large-arc flag past a half turn', () => {
    expect(ringSlicePath(50, 50, 40, 20, { start: 0, end: Math.PI * 1.5 })).toContain('A 40 40 0 1 1')
  })

  it('draws a full turn as two circles (outer and inner)', () => {
    const path = ringSlicePath(50, 50, 40, 20, { start: 0, end: FULL_TURN })
    expect(path.match(/M /g)).toHaveLength(2)
    expect(path).toContain('A 20 20 0 1 0')
  })
})
