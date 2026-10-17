import { useEffect, type RefObject } from 'react'

export type DismissReason = 'escape' | 'outside'

// Closes a popover on Escape, a press outside of it, or focus moving outside (Tab away).
export function useDismiss(ref: RefObject<HTMLElement | null>, active: boolean, onDismiss: (reason: DismissReason) => void) {
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss('escape')
    }
    const onPress = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss('outside')
    }
    // A null relatedTarget (window blur, non-focusable click) is ignored; pointerdown covers real outside clicks.
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null
      if (next && ref.current && !ref.current.contains(next)) onDismiss('outside')
    }
    const element = ref.current
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPress)
    element?.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPress)
      element?.removeEventListener('focusout', onFocusOut)
    }
  }, [ref, active, onDismiss])
}
