import type { MaintenanceLog, NewMaintenanceLog } from '../domain/maintenance'

export interface MaintenanceRepository {
  // Ordered by performedAt DESC.
  listByEquipment(equipmentId: string): Promise<MaintenanceLog[]>
  add(input: NewMaintenanceLog): Promise<MaintenanceLog>
}
