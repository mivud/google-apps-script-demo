import { useEffect, useRef, type MouseEvent, type RefObject } from 'react'

interface MainFocus {
  mainRef: RefObject<HTMLElement | null>
  skipToContent: (event: MouseEvent) => void
}

// Hash navigation keeps scroll and focus where they were; move both so keyboard and screen reader users start at the new page.
export function useMainFocus(path: string): MainFocus {
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [path])

  // A plain "#main" href would be taken as a route by the hash router.
  function skipToContent(event: MouseEvent) {
    event.preventDefault()
    mainRef.current?.focus()
  }

  return { mainRef, skipToContent }
}
