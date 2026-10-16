import type { CategoryRepository } from './category-repository'
import type { EquipmentRepository } from './equipment-repository'
import type { MaintenanceRepository } from './maintenance-repository'

export type DataService = EquipmentRepository & MaintenanceRepository & CategoryRepository
