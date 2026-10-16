'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppsScript } = require('../harness/loadAppsScript');
const { uuid, expectApiError } = require('../harness/fakes');

const Category = loadAppsScript().DeviceManagement.Domain.Category;
const row = (id, name, parentId = '') => ({ id, name, parent_id: parentId });

test('validate trims the name and keeps a root parent empty', () => {
  const candidate = row(uuid(1), '  Laptops  ');
  Category.validate(candidate, []);
  assert.equal(candidate.name, 'Laptops');
  assert.equal(candidate.parent_id, '');
});

test('validate rejects blank and non-string names and parents', () => {
  assert.throws(() => Category.validate(row(uuid(1), '   '), []), expectApiError('VALIDATION', 'category_name_required'));
  assert.throws(() => Category.validate(row(uuid(1), 5), []), expectApiError('VALIDATION', 'name must be a string'));
  assert.throws(() => Category.validate(row(uuid(1), 'A', 7), []), expectApiError('VALIDATION', 'parent_id must be a string'));
});

test('duplicate names are rejected among siblings, ignoring case and spaces', () => {
  const existing = [row(uuid(1), 'Laptops')];
  assert.throws(() => Category.validate(row(uuid(2), ' LAPTOPS '), existing), expectApiError('VALIDATION', 'category_name_duplicate'));
});

test('the same name is allowed under a different parent and for the row itself', () => {
  const existing = [row(uuid(1), 'Laptops'), row(uuid(2), 'Parts')];
  Category.validate(row(uuid(3), 'Laptops', uuid(2)), existing);
  Category.validate(row(uuid(1), 'Laptops'), existing);
});

test('parent id is normalized to lowercase and must exist', () => {
  const existing = [row(uuid(1), 'Root')];
  const child = row(uuid(2), 'Child', uuid(1).toUpperCase());
  Category.validate(child, existing);
  assert.equal(child.parent_id, uuid(1));
  assert.throws(() => Category.validate(row(uuid(3), 'X', uuid(9)), existing), expectApiError('NOT_FOUND'));
  assert.throws(() => Category.validate(row(uuid(3), 'X', 'not-an-id'), existing), expectApiError('NOT_FOUND'));
});

test('a category cannot be its own parent or sit under its descendant', () => {
  const existing = [row(uuid(1), 'A'), row(uuid(2), 'B', uuid(1)), row(uuid(3), 'C', uuid(2))];
  assert.throws(() => Category.validate(row(uuid(1), 'A', uuid(1)), existing), expectApiError('VALIDATION', 'category_cycle'));
  assert.throws(() => Category.validate(row(uuid(1), 'A', uuid(3)), existing), expectApiError('VALIDATION', 'category_cycle'));
});

test('hasChildren looks at parent_id only', () => {
  const all = [row(uuid(1), 'A'), row(uuid(2), 'B', uuid(1))];
  assert.equal(Category.hasChildren(all, uuid(1)), true);
  assert.equal(Category.hasChildren(all, uuid(2)), false);
});

test('compareByName orders case-insensitively, then by id', () => {
  const sorted = [row(uuid(3), 'beta'), row(uuid(2), 'Alpha'), row(uuid(1), 'alpha')].sort(Category.compareByName);
  assert.deepEqual(sorted.map((c) => c.id), [uuid(1), uuid(2), uuid(3)]);
});

test('newRow defaults missing parent and name to empty strings and adds audit fields', () => {
  const created = Category.newRow({ id: uuid(1) }, { created_at: 'x' });
  assert.equal(created.parent_id, '');
  assert.equal(created.name, '');
  assert.equal(created.created_at, 'x');
});
