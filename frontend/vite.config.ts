import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { themeListPlugin } from './vite-theme-plugin.ts'

const CONTRACT_TESTS = ['src/**/googlesheet/*.test.ts', 'src/**/supabase/*.test.ts']

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), themeListPlugin()],
    // Base path differs per host: GitHub Pages serves under /<repo>/, Cloudflare Pages under /.
    base: env.VITE_BASE_PATH || '/',
    test: {
      // Real-provider suites hit the network, so they run only via `npm run test:contract` (mode "contract").
      include: mode === 'contract' ? CONTRACT_TESTS : ['src/**/*.test.ts'],
      exclude: mode === 'contract' ? [] : CONTRACT_TESTS,
    },
  }
})
