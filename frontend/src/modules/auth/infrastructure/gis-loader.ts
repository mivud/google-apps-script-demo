import type { GisAccountsId } from './gis-types'

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

let scriptPromise: Promise<GisAccountsId> | null = null

// Loads the Google Identity Services script once; a failed load can be retried.
export function loadGis(): Promise<GisAccountsId> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error('GIS unavailable')))
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('GIS failed to load'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}
