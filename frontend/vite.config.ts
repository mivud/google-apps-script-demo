import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { themeListPlugin } from './vite-theme-plugin.ts'

const { version: APP_VERSION } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

const CONTRACT_TESTS = ['src/**/googlesheet/*.test.ts', 'src/**/supabase/*.test.ts']

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), themeListPlugin()],
    // Single source of truth for the version shown in the settings menu.
    define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
    // Base path differs per host: GitHub Pages serves under /<repo>/, Cloudflare Pages under /.
    base: env.VITE_BASE_PATH || '/',
    test: {
      // Real-provider suites hit the network, so they run only via `npm run test:contract` (mode "contract").
      include: mode === 'contract' ? CONTRACT_TESTS : ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      exclude: mode === 'contract' ? [] : CONTRACT_TESTS,
    },
  }
})
