// Pure geometry for a donut chart: angles start at 12 o'clock and run clockwise.
export const FULL_TURN = Math.PI * 2
const START_ANGLE = -Math.PI / 2
const MIN_SLICE_DEGREES = 2
const DEGREES_PER_HALF_TURN = 180
const MIN_SLICE_ANGLE = (MIN_SLICE_DEGREES * Math.PI) / DEGREES_PER_HALF_TURN
const EPSILON = 1e-6
const COORDINATE_DIGITS = 3

export interface SliceAngles {
  start: number
  end: number
}

// Slices keep the given order (the caller orders by stable slot, never by size). A tiny slice is widened to a
// minimum visual angle so it stays hoverable; the other slices shrink to make room. Labels use the true shares.
export function sliceAngles(values: readonly number[]): SliceAngles[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0)
  if (total <= 0) return []
  const raw = values.map((value) => (Math.max(0, value) / total) * FULL_TURN)
  const tiny = raw.map((angle) => angle > 0 && angle < MIN_SLICE_ANGLE)
  const reserved = tiny.filter(Boolean).length * MIN_SLICE_ANGLE
  const flexible = raw.reduce((sum, angle, index) => (tiny[index] ? sum : sum + angle), 0)
  const scale = flexible > 0 ? (FULL_TURN - reserved) / flexible : 1
  let cursor = START_ANGLE
  return raw.map((angle, index) => {
    const size = tiny[index] ? MIN_SLICE_ANGLE : angle * scale
    const slice = { start: cursor, end: cursor + size }
    cursor += size
    return slice
  })
}

function point(cx: number, cy: number, radius: number, angle: number): string {
  const x = (cx + radius * Math.cos(angle)).toFixed(COORDINATE_DIGITS)
  const y = (cy + radius * Math.sin(angle)).toFixed(COORDINATE_DIGITS)
  return `${x} ${y}`
}

function circle(cx: number, cy: number, radius: number, sweep: 0 | 1): string {
  const arc = `A ${radius} ${radius} 0 1 ${sweep}`
  return `M ${point(cx, cy, radius, 0)} ${arc} ${point(cx, cy, radius, Math.PI)} ${arc} ${point(cx, cy, radius, 0)} Z`
}

// A single 100% slice would be a degenerate arc, so it is drawn as a full ring (use fill-rule: evenodd).
export function ringSlicePath(cx: number, cy: number, outer: number, inner: number, angles: SliceAngles): string {
  const span = angles.end - angles.start
  if (span >= FULL_TURN - EPSILON) return `${circle(cx, cy, outer, 1)} ${circle(cx, cy, inner, 0)}`
  const large = span > Math.PI ? 1 : 0
  return [
    `M ${point(cx, cy, outer, angles.start)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${point(cx, cy, outer, angles.end)}`,
    `L ${point(cx, cy, inner, angles.end)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${point(cx, cy, inner, angles.start)}`,
    'Z',
  ].join(' ')
}
