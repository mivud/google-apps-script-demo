import { createContext, useContext } from 'react'
import type { CategoryService } from '../application/category-service'
import type { EquipmentService } from '../application/equipment-service'
import type { MaintenanceService } from '../application/maintenance-service'

export interface Services {
  equipment: EquipmentService
  maintenance: MaintenanceService
  categories: CategoryService
}

export const ServicesContext = createContext<Services | undefined>(undefined)

export function useServices(): Services {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('useServices must be used inside ServicesProvider')
  return services
}
