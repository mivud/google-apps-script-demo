import type { MaintenanceRepository } from './maintenance-repository'
import { validateNewMaintenanceLog, type MaintenanceLog, type NewMaintenanceLog } from '../domain/maintenance'

export class MaintenanceService {
  private readonly repository: MaintenanceRepository

  constructor(repository: MaintenanceRepository) {
    this.repository = repository
  }

  listByEquipment(equipmentId: string): Promise<MaintenanceLog[]> {
    return this.repository.listByEquipment(equipmentId)
  }

  async add(input: NewMaintenanceLog): Promise<MaintenanceLog> {
    return this.repository.add(validateNewMaintenanceLog(input))
  }
}
