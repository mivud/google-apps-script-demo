import type { Firestore } from 'firebase-admin/firestore';
import { DEVICE_AUDIT, type DeviceAudit } from '../../../../shared/audit/AuditStyle';
import type { RequestContext } from '../../../../shared/context/RequestContext';
import { AuditedCollection } from '../../../../shared/persistence/firestore/AuditedCollection';
import { runInTransaction, type TxContext } from '../../../../shared/persistence/firestore/TxContext';
import type {
  CategoryRepository, DeviceStore, DeviceTx, EquipmentRepository, MaintenanceLogRepository,
} from '../../application/DeviceStore';
import type { Category } from '../../domain/Category';
import type { Equipment } from '../../domain/Equipment';
import type { MaintenanceLog } from '../../domain/MaintenanceLog';

export const DeviceCollections = {
  categories: 'categories',
  equipment: 'equipment',
  maintenanceLogs: 'maintenance_logs',
} as const;

const collection = <T extends { id: string }>(ctx: TxContext, name: string) =>
  new AuditedCollection<T, DeviceAudit>(ctx, name, DEVICE_AUDIT, (row) => row.id);

function categoryRepository(ctx: TxContext): CategoryRepository {
  const categories = collection<Category>(ctx, DeviceCollections.categories);
  return {
    get: (id) => categories.get(id),
    childrenOf: (parentId) => categories.find([['parent_id', parentId]]),
    save: (category) => categories.save(category),
    remove: (id) => categories.remove(id),
  };
}

function equipmentRepository(ctx: TxContext): EquipmentRepository {
  const equipment = collection<Equipment>(ctx, DeviceCollections.equipment);
  return {
    get: (id) => equipment.get(id),
    isCategoryUsed: async (categoryId) => (await equipment.find([['category_id', categoryId]], 1)).length > 0,
    save: (row) => equipment.save(row),
    remove: (id) => equipment.remove(id),
  };
}

function maintenanceRepository(ctx: TxContext): MaintenanceLogRepository {
  const logs = collection<MaintenanceLog>(ctx, DeviceCollections.maintenanceLogs);
  return {
    ofEquipment: (equipmentId) => logs.find([['equipment_id', equipmentId]]),
    save: (log) => logs.save(log),
    remove: (id) => logs.remove(id),
  };
}

export class FirestoreDeviceStore implements DeviceStore {
  constructor(private readonly db: Firestore) {}

  run<T>(request: RequestContext, work: (tx: DeviceTx) => Promise<T>): Promise<T> {
    return runInTransaction(this.db, request, (ctx) => work({
      categories: categoryRepository(ctx),
      equipment: equipmentRepository(ctx),
      maintenance: maintenanceRepository(ctx),
    }));
  }
}
