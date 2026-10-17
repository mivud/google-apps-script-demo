'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppsScript } = require('../harness/loadAppsScript');
const { uuid, expectApiError } = require('../harness/fakes');

const Equipment = loadAppsScript().DeviceManagement.Domain.Equipment;
const validRow = (overrides) => ({ name: 'Laptop', description: '', status: 'active', quantity: 1, ...overrides });

test('newRow applies defaults: empty category, active status, quantity 1', () => {
  const created = Equipment.newRow({ id: uuid(1), name: 'Laptop' }, {});
  assert.deepEqual({ ...created }, {
    id: uuid(1), category_id: '', name: 'Laptop', description: '', status: 'active', quantity: 1
  });
});

test('validate accepts a well-formed row', () => {
  Equipment.validate(validRow());
});

test('validate requires a non-blank string name and a string description', () => {
  assert.throws(() => Equipment.validate(validRow({ name: '  ' })), expectApiError('VALIDATION', 'name is required'));
  assert.throws(() => Equipment.validate(validRow({ name: 5 })), expectApiError('VALIDATION', 'name must be a string'));
  assert.throws(() => Equipment.validate(validRow({ description: null })), expectApiError('VALIDATION', 'description must be a string'));
});

test('validate only accepts the known statuses', () => {
  ['active', 'in_repair', 'retired'].forEach((status) => Equipment.validate(validRow({ status })));
  assert.throws(() => Equipment.validate(validRow({ status: 'lost' })), expectApiError('VALIDATION', 'invalid status'));
});

test('quantity must be an integer >= 0', () => {
  [0, 1, 250].forEach((quantity) => Equipment.validate(validRow({ quantity })));
  [-1, 1.5, '2', NaN, Infinity, null].forEach((quantity) => {
    assert.throws(() => Equipment.validate(validRow({ quantity })), expectApiError('VALIDATION', 'quantity must be an integer >= 0'));
  });
});

test('category_id must be text', () => {
  Equipment.assertCategoryIdIsText('');
  assert.throws(() => Equipment.assertCategoryIdIsText(3), expectApiError('VALIDATION', 'category_id must be a string'));
});

test('trimText trims name and description only', () => {
  const target = validRow({ name: '  A ', description: ' d  ', status: 'active' });
  Equipment.trimText(target);
  assert.equal(target.name, 'A');
  assert.equal(target.description, 'd');
});
