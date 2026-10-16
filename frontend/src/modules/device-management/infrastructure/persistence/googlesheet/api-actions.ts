// Apps Script action names, namespaced as <module>.<entity>.<action>.
export const API_ACTIONS = {
  equipment: {
    list: 'device-management.equipment.list',
    get: 'device-management.equipment.get',
    create: 'device-management.equipment.create',
    update: 'device-management.equipment.update',
    remove: 'device-management.equipment.remove',
  },
  category: {
    list: 'device-management.category.list',
    get: 'device-management.category.get',
    create: 'device-management.category.create',
    update: 'device-management.category.update',
    remove: 'device-management.category.remove',
  },
  system: {
    version: 'system.version.get',
  },
  maintenance: {
    listByEquipment: 'device-management.maintenance.listByEquipment',
    add: 'device-management.maintenance.add',
  },
} as const
