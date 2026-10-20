'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppsScript } = require('../harness/loadAppsScript');
const { uuid, expectApiError } = require('../harness/fakes');

const MaintenanceLog = loadAppsScript().DeviceManagement.Domain.MaintenanceLog;
const FALLBACK = '2026-01-02T03:04:05.678+00:00';

test('assertType accepts the four types and rejects anything else', () => {
  ['new', 'repair', 'replacement', 'maintenance'].forEach((type) => MaintenanceLog.assertType(type));
  assert.throws(() => MaintenanceLog.assertType('other'), expectApiError('VALIDATION', 'invalid maintenance type'));
  assert.throws(() => MaintenanceLog.assertType(undefined), expectApiError('VALIDATION'));
});

test('assertNote allows an absent note but not a non-string', () => {
  MaintenanceLog.assertNote(undefined);
  MaintenanceLog.assertNote('ok');
  assert.throws(() => MaintenanceLog.assertNote(12), expectApiError('VALIDATION', 'note must be a string'));
  assert.throws(() => MaintenanceLog.assertNote(null), expectApiError('VALIDATION', 'note must be a string'));
});

test('normalizePerformedAt falls back to the supplied timestamp for blank values', () => {
  [undefined, null, ''].forEach((blank) => assert.equal(MaintenanceLog.normalizePerformedAt(blank, FALLBACK), FALLBACK));
});

test('normalizePerformedAt converts valid dates to UTC with a +00:00 suffix', () => {
  assert.equal(MaintenanceLog.normalizePerformedAt('2026-03-01', FALLBACK), '2026-03-01T00:00:00.000+00:00');
  assert.equal(MaintenanceLog.normalizePerformedAt('2026-03-01T10:00:00+02:00', FALLBACK), '2026-03-01T08:00:00.000+00:00');
});

test('normalizePerformedAt rejects unparsable or non-text values', () => {
  ['garbage', true, {}].forEach((bad) => {
    assert.throws(() => MaintenanceLog.normalizePerformedAt(bad, FALLBACK), expectApiError('VALIDATION', 'invalid date'));
  });
});

test('compare orders by performed_at descending, then id ascending', () => {
  const logs = [
    { id: uuid(2), performed_at: '2026-01-01' },
    { id: uuid(3), performed_at: '2026-02-01' },
    { id: uuid(1), performed_at: '2026-01-01' }
  ];
  assert.deepEqual(logs.sort(MaintenanceLog.compare).map((l) => l.id), [uuid(3), uuid(1), uuid(2)]);
});

test('newRow defaults the note to an empty string', () => {
  const created = MaintenanceLog.newRow({ id: uuid(1), equipmentId: uuid(2), type: 'new', performedAt: 'x' }, {});
  assert.equal(created.note, '');
  assert.equal(created.equipment_id, uuid(2));
});
