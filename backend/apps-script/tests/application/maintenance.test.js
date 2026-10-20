'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld, expectApiError, uuid, FIXED_NOW } = require('../harness/fakes');

const AUDIT_NOW = FIXED_NOW.replace('Z', '+00:00');
const listLogs = (world, equipmentId) => world.app.ListMaintenanceByEquipment.execute(world.deps.maintenance, { equipmentId });

test('add stores a log with normalized date, default note and audit fields', () => {
  const world = createWorld();
  const equipment = world.createEquipment({});
  const log = world.addLog({ equipmentId: equipment.id.toUpperCase(), performedAt: '2026-03-01' });
  assert.equal(log.equipment_id, equipment.id);
  assert.equal(log.performed_at, '2026-03-01T00:00:00.000+00:00');
  assert.equal(log.note, '');
  assert.equal(log.created_at, AUDIT_NOW);
  assert.equal(log.created_by, '');
});

test('add without performedAt uses the clock', () => {
  const world = createWorld();
  const equipment = world.createEquipment({});
  assert.equal(world.addLog({ equipmentId: equipment.id }).performed_at, AUDIT_NOW);
});

test('add validates type, date and note, then the equipment', () => {
  const world = createWorld();
  const equipment = world.createEquipment({});
  assert.throws(() => world.addLog({ equipmentId: uuid(99), type: 'bogus' }), expectApiError('VALIDATION', 'invalid maintenance type'));
  assert.throws(() => world.addLog({ equipmentId: equipment.id, performedAt: 'nope' }), expectApiError('VALIDATION', 'invalid date'));
  assert.throws(() => world.addLog({ equipmentId: equipment.id, note: 3 }), expectApiError('VALIDATION', 'note must be a string'));
  assert.throws(() => world.addLog({ equipmentId: uuid(99) }), expectApiError('NOT_FOUND'));
  assert.equal(world.repositories.maintenance.rows.length, 0);
});

test('add stores a trimmed vendor, null for blank, and rejects bad vendors', () => {
  const world = createWorld();
  const equipment = world.createEquipment({});
  assert.equal(world.addLog({ equipmentId: equipment.id, vendor: ' Fix It ' }).vendor, 'Fix It');
  assert.equal(world.addLog({ equipmentId: equipment.id, vendor: '  ' }).vendor, null);
  assert.equal(world.addLog({ equipmentId: equipment.id }).vendor, null);
  assert.throws(() => world.addLog({ equipmentId: equipment.id, vendor: 'x'.repeat(201) }), expectApiError('VALIDATION', 'vendor_too_long'));
  assert.throws(() => world.addLog({ equipmentId: equipment.id, vendor: 4 }), expectApiError('VALIDATION', 'vendor must be a string'));
});

test('listByEquipment exposes an empty stored vendor as null', () => {
  const world = createWorld();
  const equipment = world.createEquipment({});
  world.addLog({ equipmentId: equipment.id });
  world.repositories.maintenance.rows[0].vendor = '';
  assert.equal(listLogs(world, equipment.id)[0].vendor, null);
});

test('listByEquipment returns only that equipment, newest performed_at first', () => {
  const world = createWorld();
  const equipment = world.createEquipment({});
  const other = world.createEquipment({});
  const old = world.addLog({ equipmentId: equipment.id, performedAt: '2026-01-01' });
  const recent = world.addLog({ equipmentId: equipment.id, performedAt: '2026-02-01' });
  world.addLog({ equipmentId: other.id });
  assert.deepEqual(listLogs(world, equipment.id).map((l) => l.id), [recent.id, old.id]);
});

test('listByEquipment returns an empty list (not NOT_FOUND) for an unknown or malformed equipment id', () => {
  const world = createWorld();
  assert.deepEqual(listLogs(world, uuid(99)), []);
  assert.deepEqual(listLogs(world, 'not-an-id'), []);
});
