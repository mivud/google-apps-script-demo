import type { ReactNode } from 'react'
import { I18nProvider } from '../i18n'
import { ToastProvider } from '../toast'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider>{children}</ToastProvider>
    </I18nProvider>
  )
}
