'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppsScript, plain } = require('../harness/loadAppsScript');
const { uuid, expectApiError } = require('../harness/fakes');

const Criteria = loadAppsScript().DeviceManagement.Domain.EquipmentCriteria;
const item = (id, overrides) => ({
  id, name: 'Laptop', description: 'Dell', status: 'active', category_id: '', modified_at: '2026-01-01', ...overrides
});

test('parse applies defaults', () => {
  assert.deepEqual(plain(Criteria.parse({})), { page: 1, pageSize: 20, search: '', categoryIds: null });
});

test('page is clamped to at least 1', () => {
  [0, -5, 'abc', undefined].forEach((page) => assert.equal(Criteria.parse({ page }).page, 1));
  assert.equal(Criteria.parse({ page: '3.9' }).page, 3);
});

test('pageSize is clamped to 1..100 and defaults to 20 when missing or zero', () => {
  assert.equal(Criteria.parse({ pageSize: 1000 }).pageSize, 100);
  assert.equal(Criteria.parse({ pageSize: -3 }).pageSize, 1);
  assert.equal(Criteria.parse({ pageSize: 0 }).pageSize, 20);
  assert.equal(Criteria.parse({ pageSize: 'x' }).pageSize, 20);
  assert.equal(Criteria.parse({ pageSize: 50 }).pageSize, 50);
});

test('search neutralizes filter syntax characters, trims and lowercases', () => {
  assert.equal(Criteria.parse({ search: '  A,B(c)D ' }).search, 'a b c d');
  assert.equal(Criteria.parse({ search: null }).search, '');
});

test('categoryIds: none means no filter, bad ids become empty strings, ids are lowercased', () => {
  assert.equal(Criteria.parse({ categoryIds: [] }).categoryIds, null);
  assert.equal(Criteria.parse({ categoryIds: null }).categoryIds, null);
  assert.deepEqual(plain(Criteria.parse({ categoryIds: [uuid(1).toUpperCase(), 'bad'] }).categoryIds), [uuid(1), '']);
  assert.throws(() => Criteria.parse({ categoryIds: 'x' }), expectApiError('VALIDATION', 'categoryIds must be an array'));
});

test('matches combines category, status and text search on name or description', () => {
  const row = item(uuid(1), { category_id: uuid(5), status: 'retired' });
  assert.equal(Criteria.matches(row, { categoryIds: [uuid(5)] }), true);
  assert.equal(Criteria.matches(row, { categoryIds: [uuid(6)] }), false);
  assert.equal(Criteria.matches(row, { status: 'active' }), false);
  assert.equal(Criteria.matches(row, { search: 'dell' }), true);
  assert.equal(Criteria.matches(row, { search: 'lap' }), true);
  assert.equal(Criteria.matches(row, { search: 'xyz' }), false);
});

test('compare orders by modified_at descending, then id ascending', () => {
  const rows = [item(uuid(2)), item(uuid(1)), item(uuid(3), { modified_at: '2026-02-01' })];
  assert.deepEqual(rows.sort(Criteria.compare).map((r) => r.id), [uuid(3), uuid(1), uuid(2)]);
});

test('paginate slices the page and keeps total; out-of-range pages are empty', () => {
  const rows = [1, 2, 3, 4, 5];
  assert.deepEqual(plain(Criteria.paginate(rows, { page: 2, pageSize: 2 })), { items: [3, 4], total: 5, page: 2, pageSize: 2 });
  assert.deepEqual(plain(Criteria.paginate(rows, { page: 9, pageSize: 2 })), { items: [], total: 5, page: 9, pageSize: 2 });
});
