import type { RequestContext } from '../../../shared/context/RequestContext';
import type { Category, StoredCategory } from '../domain/Category';
import type { Equipment, StoredEquipment } from '../domain/Equipment';
import type { MaintenanceLog, StoredMaintenanceLog } from '../domain/MaintenanceLog';

// Ports of the device-management aggregates (Category, Equipment with its maintenance logs).
export interface CategoryRepository {
  get(id: string): Promise<StoredCategory | null>;
  childrenOf(parentId: string | null): Promise<StoredCategory[]>;
  save(category: Category): Promise<StoredCategory>;
  remove(id: string): void;
}

export interface EquipmentRepository {
  get(id: string): Promise<StoredEquipment | null>;
  isCategoryUsed(categoryId: string): Promise<boolean>;
  save(equipment: Equipment): Promise<StoredEquipment>;
  remove(id: string): void;
}

export interface MaintenanceLogRepository {
  ofEquipment(equipmentId: string): Promise<StoredMaintenanceLog[]>;
  save(log: MaintenanceLog): Promise<StoredMaintenanceLog>;
  remove(id: string): void;
}

export interface DeviceTx {
  categories: CategoryRepository;
  equipment: EquipmentRepository;
  maintenance: MaintenanceLogRepository;
}

export interface DeviceStore {
  run<T>(request: RequestContext, work: (tx: DeviceTx) => Promise<T>): Promise<T>;
}
