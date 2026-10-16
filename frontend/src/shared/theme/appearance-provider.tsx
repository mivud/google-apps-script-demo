import type { ReactNode } from 'react'
import { ColorSchemeProvider } from './color-scheme-provider'
import { ThemeProvider } from './theme-provider'

// Composition point so the entry file mounts one provider for everything about appearance.
export function AppearanceProvider({ children }: { children: ReactNode }) {
  return (
    <ColorSchemeProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </ColorSchemeProvider>
  )
}
