import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { resolveColorScheme, type ColorSchemeMode } from './color-scheme'
import { applyColorScheme } from './apply-color-scheme'
import { ColorSchemeContext, type ColorSchemeValue } from './color-scheme-context'
import { readColorSchemeMode, saveColorSchemeMode } from './color-scheme-storage'
import { usePrefersDark } from './use-prefers-dark'

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorSchemeMode>(readColorSchemeMode)
  const prefersDark = usePrefersDark()
  const resolved = resolveColorScheme(mode, prefersDark)

  useEffect(() => {
    applyColorScheme(resolved)
  }, [resolved])

  const setMode = useCallback((next: ColorSchemeMode) => {
    setModeState(next)
    saveColorSchemeMode(next)
  }, [])

  const value = useMemo<ColorSchemeValue>(() => ({ mode, resolved, setMode }), [mode, resolved, setMode])
  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>
}
