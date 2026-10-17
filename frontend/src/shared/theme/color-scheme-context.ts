import { createContext } from 'react'
import type { ColorSchemeMode, ResolvedColorScheme } from './color-scheme'

export interface ColorSchemeValue {
  mode: ColorSchemeMode
  resolved: ResolvedColorScheme
  setMode: (mode: ColorSchemeMode) => void
}

export const ColorSchemeContext = createContext<ColorSchemeValue | null>(null)
