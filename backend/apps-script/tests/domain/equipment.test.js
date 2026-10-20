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
    id: uuid(1), category_id: '', name: 'Laptop', description: '', status: 'active', quantity: 1,
    purchase_date: null, warranty_months: null, warranty_expiry_date: null, note: null, vendor: null
  });
});

test('validate normalizes blank optional fields to null and keeps inner newlines', () => {
  const row = validRow({ note: '  a\nb  ', vendor: '   ', purchase_date: '', warranty_months: null });
  Equipment.validate(row);
  assert.equal(row.note, 'a\nb');
  assert.equal(row.vendor, null);
  assert.equal(row.purchase_date, null);
});

test('validate checks optional text types and lengths', () => {
  assert.throws(() => Equipment.validate(validRow({ note: 5 })), expectApiError('VALIDATION', 'note must be a string'));
  assert.throws(() => Equipment.validate(validRow({ vendor: 'x'.repeat(201) })), expectApiError('VALIDATION', 'vendor_too_long'));
  assert.throws(() => Equipment.validate(validRow({ note: 'x'.repeat(2001) })), expectApiError('VALIDATION', 'note_too_long'));
  Equipment.validate(validRow({ note: 'x'.repeat(2000), vendor: 'x'.repeat(200) }));
});

test('validate applies the warranty rules', () => {
  assert.throws(() => Equipment.validate(validRow({ warranty_months: 12 })), expectApiError('VALIDATION'));
  assert.throws(() => Equipment.validate(validRow({ purchase_date: '2026-02-30' })), expectApiError('VALIDATION'));
  Equipment.validate(validRow({ purchase_date: '2999-01-01', warranty_months: 0 }));
});

test('fromStored maps empty cells to null and months text to a number', () => {
  const stored = Equipment.fromStored({ name: 'A', purchase_date: '', warranty_months: '24', warranty_expiry_date: '', note: '', vendor: 'Acme' });
  assert.equal(stored.purchase_date, null);
  assert.equal(stored.warranty_months, 24);
  assert.equal(stored.note, null);
  assert.equal(stored.vendor, 'Acme');
  assert.equal(Equipment.fromStored({ warranty_months: '' }).warranty_months, null);
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
