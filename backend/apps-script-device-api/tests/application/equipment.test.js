'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld, expectApiError, uuid, FIXED_NOW } = require('../harness/fakes');

const AUDIT_NOW = FIXED_NOW.replace('Z', '+00:00');
const execute = (world, useCase, input) => world.app[useCase].execute(world.deps.equipment, input);

test('create applies defaults, trims text and stamps audit fields', () => {
  const world = createWorld();
  const created = world.createEquipment({ name: '  Laptop ', description: ' Dell ' });
  assert.equal(created.id, uuid(1));
  assert.equal(created.name, 'Laptop');
  assert.equal(created.description, 'Dell');
  assert.equal(created.status, 'active');
  assert.equal(created.quantity, 1);
  assert.equal(created.category_id, '');
  assert.equal(created.created_at, AUDIT_NOW);
  assert.equal(created.modified_at, AUDIT_NOW);
  assert.equal(created.created_by, '');
});

test('create resolves the category id and rejects an unknown category', () => {
  const world = createWorld();
  const category = world.createCategory('Laptops');
  assert.equal(world.createEquipment({ categoryId: ` ${category.id.toUpperCase()} ` }).category_id, category.id);
  assert.throws(() => world.createEquipment({ categoryId: uuid(99) }), expectApiError('NOT_FOUND'));
});

test('create reports shape errors before the category lookup', () => {
  const world = createWorld();
  assert.throws(
    () => world.createEquipment({ status: 'lost', categoryId: uuid(99) }),
    expectApiError('VALIDATION', 'invalid status')
  );
  assert.equal(world.repositories.equipment.rows.length, 0);
});

test('update has patch semantics: untouched fields stay, audit modified fields change', () => {
  const world = createWorld();
  const created = world.createEquipment({ name: 'Laptop', quantity: 3 });
  world.clock.set('2026-02-03T04:05:06.789Z');
  const updated = execute(world, 'UpdateEquipment', { id: created.id, patch: { quantity: 5, id: uuid(77), created_by: 'x' } });
  assert.equal(updated.quantity, 5);
  assert.equal(updated.name, 'Laptop');
  assert.equal(updated.id, created.id);
  assert.equal(updated.created_by, '');
  assert.equal(updated.created_at, AUDIT_NOW);
  assert.equal(updated.modified_at, '2026-02-03T04:05:06.789+00:00');
});

test('update null category_id clears the category; invalid values are rejected', () => {
  const world = createWorld();
  const category = world.createCategory('Laptops');
  const created = world.createEquipment({ categoryId: category.id });
  assert.equal(execute(world, 'UpdateEquipment', { id: created.id, patch: { category_id: null } }).category_id, '');
  assert.throws(() => execute(world, 'UpdateEquipment', { id: created.id, patch: { quantity: -1 } }), expectApiError('VALIDATION'));
  assert.throws(() => execute(world, 'UpdateEquipment', { id: uuid(99), patch: {} }), expectApiError('NOT_FOUND'));
  assert.throws(() => execute(world, 'UpdateEquipment', { id: created.id, patch: 5 }), expectApiError('VALIDATION', 'patch must be an object'));
});

test('create derives the warranty expiry and ignores a client-supplied one', () => {
  const world = createWorld();
  const created = world.createEquipment({
    purchaseDate: '2026-01-31', warrantyMonths: 1, warrantyExpiryDate: '1999-01-01', note: ' n ', vendor: ' Acme '
  });
  assert.equal(created.warranty_expiry_date, '2026-02-28');
  assert.equal(created.note, 'n');
  assert.equal(created.vendor, 'Acme');
  assert.equal(world.createEquipment({ purchaseDate: '2026-01-31' }).warranty_expiry_date, null);
  assert.throws(() => world.createEquipment({ warrantyMonths: 6 }), expectApiError('VALIDATION'));
});

test('update recomputes the expiry and cannot patch it directly', () => {
  const world = createWorld();
  const created = world.createEquipment({ purchaseDate: '2026-01-15', warrantyMonths: 12 });
  const patched = execute(world, 'UpdateEquipment', { id: created.id, patch: { warranty_months: 24, warranty_expiry_date: '1999-01-01' } });
  assert.equal(patched.warranty_expiry_date, '2028-01-15');
  assert.throws(() => execute(world, 'UpdateEquipment', { id: created.id, patch: { purchase_date: null } }), expectApiError('VALIDATION'));
  const cleared = execute(world, 'UpdateEquipment', { id: created.id, patch: { purchase_date: null, warranty_months: null } });
  assert.equal(cleared.warranty_expiry_date, null);
});

test('get and list expose stored empty optional cells as null', () => {
  const world = createWorld();
  const created = world.createEquipment({});
  world.repositories.equipment.rows[0].purchase_date = '';
  world.repositories.equipment.rows[0].warranty_months = '';
  const got = execute(world, 'GetEquipment', { id: created.id });
  assert.equal(got.purchase_date, null);
  assert.equal(got.warranty_months, null);
  assert.equal(execute(world, 'ListEquipment', {}).items[0].vendor, null);
});

test('get returns the row or null', () => {
  const world = createWorld();
  const created = world.createEquipment({});
  assert.equal(execute(world, 'GetEquipment', { id: created.id }).name, 'Laptop');
  assert.equal(execute(world, 'GetEquipment', { id: uuid(99) }), null);
});

test('remove cascades to the maintenance logs of that equipment only', () => {
  const world = createWorld();
  const first = world.createEquipment({ name: 'First' });
  const second = world.createEquipment({ name: 'Second' });
  world.addLog({ equipmentId: first.id });
  world.addLog({ equipmentId: second.id });
  assert.equal(execute(world, 'RemoveEquipment', { id: first.id }), null);
  assert.deepEqual(world.repositories.equipment.rows.map((r) => r.id), [second.id]);
  assert.deepEqual(world.repositories.maintenance.rows.map((r) => r.equipment_id), [second.id]);
  assert.throws(() => execute(world, 'RemoveEquipment', { id: first.id }), expectApiError('NOT_FOUND'));
});

test('list filters by the category ids it is given (the client expands descendants)', () => {
  const world = createWorld();
  const parent = world.createCategory('Computers');
  const child = world.createCategory('Laptops', parent.id);
  world.createEquipment({ name: 'On parent', categoryId: parent.id });
  world.createEquipment({ name: 'On child', categoryId: child.id });
  world.createEquipment({ name: 'Uncategorized' });
  const names = (categoryIds) => execute(world, 'ListEquipment', { categoryIds }).items.map((r) => r.name).sort();
  assert.deepEqual(names([parent.id]), ['On parent']);
  assert.deepEqual(names([parent.id, child.id]), ['On child', 'On parent']);
  assert.equal(names(undefined).length, 3);
});

test('list searches, filters by status, orders by modified_at desc and paginates', () => {
  const world = createWorld();
  const older = world.createEquipment({ name: 'Old printer', status: 'retired' });
  world.clock.set('2026-03-01T00:00:00.000Z');
  world.createEquipment({ name: 'New printer' });
  world.createEquipment({ name: 'Monitor' });
  const list = (input) => execute(world, 'ListEquipment', input);
  assert.deepEqual(list({ search: 'PRINTER' }).items.map((r) => r.name), ['New printer', 'Old printer']);
  assert.deepEqual(list({ status: 'retired' }).items.map((r) => r.id), [older.id]);
  const page = list({ page: 2, pageSize: 2 });
  assert.equal(page.total, 3);
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].id, older.id);
});
