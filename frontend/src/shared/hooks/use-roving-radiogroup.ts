import { useRef, type KeyboardEvent } from 'react'

const ARROW_STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

function targetIndex(key: string, index: number, count: number): number | undefined {
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  const step = ARROW_STEP[key]
  return step ? (index + step + count) % count : undefined
}

// Roving tabindex radiogroup: arrows, Home and End move the selection and focus, matching native radios.
export function useRovingRadiogroup(count: number, select: (index: number) => void) {
  const groupRef = useRef<HTMLDivElement>(null)

  function onKeyDown(event: KeyboardEvent, index: number) {
    const next = targetIndex(event.key, index, count)
    if (next === undefined) return
    event.preventDefault()
    select(next)
    groupRef.current?.querySelectorAll<HTMLElement>('[role=radio]')[next]?.focus()
  }

  return { groupRef, onKeyDown }
}
