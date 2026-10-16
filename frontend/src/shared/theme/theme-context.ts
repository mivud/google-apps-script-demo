import { createContext } from 'react'
import type { Theme } from './themes'

export interface ThemeValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeValue | null>(null)
