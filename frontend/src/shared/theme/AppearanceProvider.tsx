import type { ReactNode } from 'react'
import { ColorSchemeProvider } from './ColorSchemeProvider'
import { ThemeProvider } from './ThemeProvider'

// Composition point so the entry file mounts one provider for everything about appearance.
export function AppearanceProvider({ children }: { children: ReactNode }) {
  return (
    <ColorSchemeProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </ColorSchemeProvider>
  )
}
