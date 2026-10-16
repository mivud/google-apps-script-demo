import { describe } from 'vitest'
import { runDataServiceContract } from '../contract/data-service.contract'
import { SheetsAdapter } from './sheets-adapter'

const apiUrl = import.meta.env.VITE_SHEETS_API_URL
const token = import.meta.env.VITE_SHEETS_API_TOKEN

// Hits a real deployed Web App, so it only runs when credentials are provided explicitly.
if (apiUrl && token) {
  runDataServiceContract('SheetsAdapter', () => new SheetsAdapter({ apiUrl, token }))
} else {
  describe.skip('DataService contract: SheetsAdapter (set VITE_SHEETS_API_URL and VITE_SHEETS_API_TOKEN)', () => {})
}
