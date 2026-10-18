const LIST_GAP_PX = 4
const LIST_EDGE_MARGIN_PX = 8
const LIST_MAX_HEIGHT_PX = 256
const LIST_MIN_HEIGHT_PX = 96

export interface ListPlacement {
  above: boolean
  maxHeight: number
}

// Opens below the button unless there is clearly more room above (e.g. a select near the bottom of a dialog).
export function measurePlacement(root: HTMLElement): ListPlacement {
  const bounds = (root.closest('dialog') ?? document.documentElement).getBoundingClientRect()
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const top = Math.max(0, bounds.top)
  const bottom = Math.min(viewportHeight, bounds.bottom || viewportHeight)
  const rect = root.getBoundingClientRect()
  const below = bottom - rect.bottom - LIST_GAP_PX - LIST_EDGE_MARGIN_PX
  const above = rect.top - top - LIST_GAP_PX - LIST_EDGE_MARGIN_PX
  const useAbove = below < LIST_MIN_HEIGHT_PX && above > below
  const room = useAbove ? above : below
  return { above: useAbove, maxHeight: Math.min(LIST_MAX_HEIGHT_PX, Math.max(LIST_MIN_HEIGHT_PX, room)) }
}
