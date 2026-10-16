import { CategoryService, EquipmentService, MaintenanceService, type Services } from '../modules/device-management'
import { createDataService } from './data-service-factory'
import { readEnv } from './env'

export function buildServices(): Services {
  const dataService = createDataService(readEnv(import.meta.env))
  const categories = new CategoryService(dataService)
  return {
    equipment: new EquipmentService(dataService, categories),
    maintenance: new MaintenanceService(dataService),
    categories,
    systemInfo: dataService,
  }
}
