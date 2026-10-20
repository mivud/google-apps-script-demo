'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld, expectApiError, uuid } = require('../harness/fakes');

const ACTIONS = [
  'device-management.category.list', 'device-management.category.get', 'device-management.category.create',
  'device-management.category.update', 'device-management.category.remove',
  'device-management.equipment.list', 'device-management.equipment.get', 'device-management.equipment.create',
  'device-management.equipment.update', 'device-management.equipment.remove',
  'device-management.maintenance.listByEquipment', 'device-management.maintenance.add'
];

function createRouter(world) {
  const registry = world.context.Composition.createEndpointRegistry(world.deps);
  return new world.context.Router(registry);
}

const call = (router, action, payload) => router.resolve(action)(payload);

test('all 12 device-management actions resolve to handlers', () => {
  const router = createRouter(createWorld());
  assert.equal(ACTIONS.length, 12);
  ACTIONS.forEach((action) => assert.equal(typeof router.resolve(action), 'function', action));
});

test('old unprefixed names and inherited object keys do not resolve', () => {
  const router = createRouter(createWorld());
  ['category.list', 'equipment.get', 'maintenance.add', 'toString', '__proto__', undefined].forEach((action) => {
    assert.throws(() => router.resolve(action), expectApiError('VALIDATION'), String(action));
  });
});

test('category.create maps parent_id and category.update maps patch', () => {
  const world = createWorld();
  const router = createRouter(world);
  const root = call(router, 'device-management.category.create', { name: 'Root' });
  const child = call(router, 'device-management.category.create', { name: 'Child', parent_id: root.id });
  assert.equal(child.parent_id, root.id);
  const renamed = call(router, 'device-management.category.update', { id: child.id, patch: { name: 'Renamed' } });
  assert.equal(renamed.name, 'Renamed');
  assert.equal(call(router, 'device-management.category.list', {}).length, 2);
  assert.equal(call(router, 'device-management.category.get', { id: root.id }).name, 'Root');
  assert.equal(call(router, 'device-management.category.remove', { id: child.id }), null);
});

test('equipment.create maps snake_case fields and ignores client-supplied id and audit columns', () => {
  const world = createWorld();
  const router = createRouter(world);
  const category = world.createCategory('Laptops');
  const created = call(router, 'device-management.equipment.create', {
    category_id: category.id, name: 'Laptop', quantity: 2, id: uuid(77), created_by: 'hacker', created_at: 'x'
  });
  assert.equal(created.category_id, category.id);
  assert.equal(created.quantity, 2);
  assert.notEqual(created.id, uuid(77));
  assert.equal(created.created_by, '');
  assert.notEqual(created.created_at, 'x');
});

test('equipment.list, update and remove pass their payload through to the use cases', () => {
  const world = createWorld();
  const router = createRouter(world);
  const created = world.createEquipment({ name: 'Printer' });
  const list = call(router, 'device-management.equipment.list', { search: 'print', page: 1, pageSize: 5 });
  assert.equal(list.total, 1);
  assert.equal(list.pageSize, 5);
  const updated = call(router, 'device-management.equipment.update', { id: created.id, patch: { status: 'in_repair' } });
  assert.equal(updated.status, 'in_repair');
  assert.equal(call(router, 'device-management.equipment.remove', { id: created.id }), null);
});

test('maintenance.add reads snake_case; listByEquipment reads the camelCase equipmentId', () => {
  const world = createWorld();
  const router = createRouter(world);
  const equipment = world.createEquipment({});
  const log = call(router, 'device-management.maintenance.add', {
    equipment_id: equipment.id, type: 'repair', performed_at: '2026-03-01', note: 'Fan'
  });
  assert.equal(log.equipment_id, equipment.id);
  assert.equal(log.note, 'Fan');
  const logs = call(router, 'device-management.maintenance.listByEquipment', { equipmentId: equipment.id });
  assert.deepEqual(logs.map((l) => l.id), [log.id]);
  assert.deepEqual(call(router, 'device-management.maintenance.listByEquipment', { equipment_id: equipment.id }), []);
});
