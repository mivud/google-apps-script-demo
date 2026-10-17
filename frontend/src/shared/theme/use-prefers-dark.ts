import { useSyncExternalStore } from 'react'
import { DARK_MEDIA_QUERY } from './color-scheme'

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_MEDIA_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

// Live value of the OS preference, so "system" mode follows OS changes without a reload.
export function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(DARK_MEDIA_QUERY).matches)
}
