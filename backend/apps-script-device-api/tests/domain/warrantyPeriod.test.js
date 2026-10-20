'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadAppsScript } = require('../harness/loadAppsScript');
const { expectApiError } = require('../harness/fakes');

const WarrantyPeriod = loadAppsScript().DeviceManagement.Domain.WarrantyPeriod;

test('expiryDate adds whole months', () => {
  assert.equal(WarrantyPeriod.expiryDate('2026-03-15', 12), '2027-03-15');
  assert.equal(WarrantyPeriod.expiryDate('2026-11-10', 3), '2027-02-10');
  assert.equal(WarrantyPeriod.expiryDate('2026-03-15', 0), '2026-03-15');
});

test('expiryDate clamps to the end of a shorter month', () => {
  assert.equal(WarrantyPeriod.expiryDate('2026-01-31', 1), '2026-02-28');
  assert.equal(WarrantyPeriod.expiryDate('2027-12-31', 2), '2028-02-29');
  assert.equal(WarrantyPeriod.expiryDate('2026-08-31', 1), '2026-09-30');
});

test('expiryDate is null without a purchase date or months', () => {
  assert.equal(WarrantyPeriod.expiryDate(null, null), null);
  assert.equal(WarrantyPeriod.expiryDate('2026-01-01', null), null);
});

test('validate enforces date shape, months range and the date requirement', () => {
  WarrantyPeriod.validate(null, null);
  WarrantyPeriod.validate('2026-01-01', null);
  WarrantyPeriod.validate('2026-01-01', 0);
  WarrantyPeriod.validate('2999-12-31', WarrantyPeriod.MAX_MONTHS);
  ['2026-02-30', '2026-1-1', 'tomorrow', '2026-13-01', '1800-01-01', 20260101].forEach((bad) => {
    assert.throws(() => WarrantyPeriod.validate(bad, null), expectApiError('VALIDATION', 'purchase_date_invalid'));
  });
  [-1, 601, 1.5, '12', NaN].forEach((bad) => {
    assert.throws(() => WarrantyPeriod.validate('2026-01-01', bad), expectApiError('VALIDATION', 'warranty_months_invalid'));
  });
  assert.throws(() => WarrantyPeriod.validate(null, 12), expectApiError('VALIDATION', 'warranty_requires_purchase_date'));
});

test('isExpired treats the expiry day as still covered', () => {
  assert.equal(WarrantyPeriod.isExpired('2026-05-01', '2026-05-01'), false);
  assert.equal(WarrantyPeriod.isExpired('2026-05-01', '2026-05-02'), true);
  assert.equal(WarrantyPeriod.isExpired(null, '2026-05-02'), false);
});
