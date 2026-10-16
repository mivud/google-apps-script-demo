import { describe } from 'vitest'
import { runDataServiceContract } from '../contract/data-service.contract'
import { SheetsAdapter } from './sheets-adapter'

const apiUrl = import.meta.env.VITE_SHEETS_API_URL
// A short-lived Google ID token of an admin; read from the shell env so it never enters the bundle.
const idToken = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.TEST_GOOGLE_ID_TOKEN

// Hits a real deployed Web App, so it only runs when credentials are provided explicitly.
if (apiUrl && idToken) {
  runDataServiceContract('SheetsAdapter', () => new SheetsAdapter({ apiUrl, getIdToken: () => idToken }))
} else {
  describe.skip('DataService contract: SheetsAdapter (set VITE_SHEETS_API_URL and TEST_GOOGLE_ID_TOKEN)', () => {})
}
