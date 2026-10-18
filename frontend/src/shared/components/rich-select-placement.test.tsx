// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { measurePlacement } from './rich-select-placement'

const VIEWPORT_HEIGHT = 800

function rectAt(top: number, height: number): DOMRect {
  return { top, bottom: top + height, height } as DOMRect
}

function buildSelect(buttonTop: number) {
  const dialog = document.createElement('dialog')
  const root = document.createElement('div')
  dialog.append(root)
  document.body.append(dialog)
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(rectAt(100, 600))
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rectAt(buttonTop, 44))
  return root
}

describe('measurePlacement', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('opens below with the full height when there is room', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(VIEWPORT_HEIGHT)
    const placement = measurePlacement(buildSelect(150))
    expect(placement).toEqual({ above: false, maxHeight: 256 })
  })

  it('flips above when the dialog leaves little room below', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(VIEWPORT_HEIGHT)
    const placement = measurePlacement(buildSelect(620))
    expect(placement.above).toBe(true)
    expect(placement.maxHeight).toBe(256)
  })

  it('never shrinks the list below the minimum height', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(VIEWPORT_HEIGHT)
    expect(measurePlacement(buildSelect(655)).maxHeight).toBeGreaterThanOrEqual(96)
  })
})
