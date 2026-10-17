import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Icon } from '../components/icon'
import { useI18n } from '../i18n'
import { ToastContext, type ToastApi, type ToastTone } from './toast-context'

const TOAST_DURATION_MS = 4000
// Keeps a burst of errors from filling the screen.
const MAX_TOASTS = 3

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback((message: string, tone: ToastTone) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, tone }].slice(-MAX_TOASTS))
    timers.current.set(id, window.setTimeout(() => dismiss(id), TOAST_DURATION_MS))
  }, [dismiss])

  useEffect(() => {
    const active = timers.current
    return () => active.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const api = useMemo<ToastApi>(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Top right so toasts never cover the primary buttons at the bottom of the screen. */}
      <div className="toast-region" role="region" aria-label={t('common.notifications')} aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`} style={{ '--toast-duration': `${TOAST_DURATION_MS}ms` } as CSSProperties} role={toast.tone === 'error' ? 'alert' : 'status'}>
            <span className="toast-icon"><Icon name={toast.tone === 'error' ? 'close' : 'check'} /></span>
            <span className="toast-message">{toast.message}</span>
            <button type="button" className="toast-close" aria-label={t('common.dismiss')} onClick={() => dismiss(toast.id)}>&times;</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
