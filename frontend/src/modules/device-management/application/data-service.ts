import type { CategoryRepository } from './category-repository'
import type { EquipmentRepository } from './equipment-repository'
import type { MaintenanceRepository } from './maintenance-repository'
import type { SystemInfoRepository } from './system-info-repository'

export type DataService = EquipmentRepository & MaintenanceRepository & CategoryRepository & SystemInfoRepository
