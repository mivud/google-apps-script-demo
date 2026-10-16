import { useContext } from 'react'
import { ColorSchemeContext, type ColorSchemeValue } from './color-scheme-context'

export function useColorScheme(): ColorSchemeValue {
  const value = useContext(ColorSchemeContext)
  if (!value) throw new Error('useColorScheme must be used inside ColorSchemeProvider')
  return value
}
