import { useEffect, useState } from 'react'
import { pathFromHash } from './launcher/app-route'

export function useHashPath(): string {
  const [path, setPath] = useState(() => pathFromHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setPath(pathFromHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return path
}
