'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadIdentityApi, plain } = require('../harness/loadAppsScript');

const context = loadIdentityApi();
const Repository = context.Auth.Persistence.GoogleSheet.UserRepository;

function repositoryWith(rows) {
  // Replaces the sheet table; the repository only needs readAll().
  context.SpreadsheetTable = function FakeTable() { this.readAll = () => rows; };
  return Repository.create({}, {});
}

const row = (overrides) => ({ id: 'u1', email: 'Ann@Example.com', role: 'Admin', active: 'TRUE', ...overrides });

test('schema declares the users sheet columns', () => {
  assert.equal(Repository.SCHEMA.sheetName, 'users');
  assert.deepEqual(plain(Repository.SCHEMA.headers), ['id', 'email', 'role', 'active', 'created_at', 'updated_at']);
});

test('findByEmail maps a row to a normalized user', () => {
  const user = repositoryWith([row()]).findByEmail('ann@example.com');
  assert.deepEqual(plain(user), { id: 'u1', email: 'ann@example.com', role: 'admin', active: true });
});

test('findByEmail returns null for an unknown email', () => {
  assert.equal(repositoryWith([row()]).findByEmail('other@example.com'), null);
});

test('active only accepts the text true, case-insensitive and trimmed', () => {
  ['true', 'TRUE', 'True', ' true '].forEach((value) => {
    assert.equal(repositoryWith([row({ active: value })]).findByEmail('ann@example.com').active, true, value);
  });
  ['false', 'yes', '1', '', 'tru', 'x'].forEach((value) => {
    assert.equal(repositoryWith([row({ active: value })]).findByEmail('ann@example.com').active, false, value);
  });
});

test('an unknown role yields an empty role so the user cannot sign in', () => {
  const user = repositoryWith([row({ role: 'owner' })]).findByEmail('ann@example.com');
  assert.equal(user.role, '');
  assert.equal(context.Auth.Domain.User.canSignIn(user), false);
});
