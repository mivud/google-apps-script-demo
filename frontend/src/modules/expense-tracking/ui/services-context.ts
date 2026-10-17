import { createContext, useContext } from 'react'
import type { ExpenseTrackingServices } from '../infrastructure/create-expense-tracking-services'

export const ExpenseTrackingServicesContext = createContext<ExpenseTrackingServices | undefined>(undefined)

export function useExpenseTrackingServices(): ExpenseTrackingServices {
  const services = useContext(ExpenseTrackingServicesContext)
  if (!services) throw new Error('useExpenseTrackingServices must be used inside ExpenseTrackingServicesContext')
  return services
}
