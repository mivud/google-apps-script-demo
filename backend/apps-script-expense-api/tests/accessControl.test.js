'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadExpenseApi, codeOf } = require('./harness/loadExpenseApi');

const { AccessControl } = loadExpenseApi();
const permission = (value, key = 'permission') => ({ key, value });
const holder = (...claims) => ({ email: 'a@b.c', role: '', roles: [], claims });

test('super (primary role or in roles) may read and write', () => {
  [{ ...holder(), role: 'super' }, { ...holder(), roles: ['reader', 'super'] }].forEach((access) => {
    assert.equal(codeOf(() => AccessControl.assertCanRead(access)), null);
    assert.equal(codeOf(() => AccessControl.assertCanWrite(access)), null);
  });
});

test('expense.read reads only and expense.write writes only', () => {
  const reader = holder(permission('expense.read'));
  assert.equal(codeOf(() => AccessControl.assertCanRead(reader)), null);
  assert.equal(codeOf(() => AccessControl.assertCanWrite(reader)), 'FORBIDDEN');
  const writer = holder(permission('expense.write'));
  assert.equal(codeOf(() => AccessControl.assertCanWrite(writer)), null);
  assert.equal(codeOf(() => AccessControl.assertCanRead(writer)), 'FORBIDDEN');
});

test('near-miss, foreign or malformed access is denied (exact match)', () => {
  const denied = [
    null, undefined, {}, holder(),
    holder(permission('Expense.Read'), permission('expense.read ', 'permission'), permission('expense.read', 'Permission')),
    holder(permission('device.mgt.read'), permission('device.mgt.write')),
    holder(permission('expense.read', 'perm')),
    { ...holder(), role: 'Super', roles: ['SUPER', 'superuser'] }
  ];
  denied.forEach((access, index) => {
    assert.equal(codeOf(() => AccessControl.assertCanRead(access)), 'FORBIDDEN', `read ${index}`);
    assert.equal(codeOf(() => AccessControl.assertCanWrite(access)), 'FORBIDDEN', `write ${index}`);
  });
});
