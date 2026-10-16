import type { ReactNode } from 'react'
import { ServicesContext, type Services } from './services-context'

export function ServicesProvider({ services, children }: { services: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
}
