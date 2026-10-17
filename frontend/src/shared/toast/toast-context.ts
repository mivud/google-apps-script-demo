import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error'

export interface ToastApi {
  show: (message: string, tone: ToastTone) => void
}

export const ToastContext = createContext<ToastApi | undefined>(undefined)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside ToastProvider')
  return api
}
