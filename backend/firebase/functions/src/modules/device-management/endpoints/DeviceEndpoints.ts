import { Permission } from '../../../shared/auth/Access';
import type { ActionDefinition } from '../../../shared/dispatch/ActionRouter';
import type { CategoryCommands } from '../application/CategoryCommands';
import type { EquipmentCommands } from '../application/EquipmentCommands';
import type { MaintenanceCommands } from '../application/MaintenanceCommands';

export interface DeviceEndpointDeps {
  categories: CategoryCommands;
  equipment: EquipmentCommands;
  maintenance: MaintenanceCommands;
}

const write = Permission.DeviceWrite;

// Same action names and payloads as the Apps Script module. Lists and gets are read directly from Firestore.
export function deviceActions({ categories, equipment, maintenance }: DeviceEndpointDeps): ActionDefinition[] {
  return [
    { action: 'device-management.category.create', permission: write,
      handler: (c) => categories.create(c.request, c.payload.data) },
    { action: 'device-management.category.update', permission: write,
      handler: (c) => categories.update(c.request, c.payload.requiredString('id'), c.payload.object('patch').data) },
    { action: 'device-management.category.remove', permission: write,
      handler: (c) => categories.remove(c.request, c.payload.requiredString('id')) },

    { action: 'device-management.equipment.create', permission: write,
      handler: (c) => equipment.create(c.request, c.payload.data) },
    { action: 'device-management.equipment.update', permission: write,
      handler: (c) => equipment.update(c.request, c.payload.requiredString('id'), c.payload.object('patch').data) },
    { action: 'device-management.equipment.remove', permission: write,
      handler: (c) => equipment.remove(c.request, c.payload.requiredString('id')) },

    { action: 'device-management.maintenance.add', permission: write,
      handler: (c) => maintenance.add(c.request, c.payload.requiredString('equipment_id'), c.payload.data) },
  ];
}
