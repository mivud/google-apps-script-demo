'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  SUPER, createSuperWorld, succeed, failWith, failDomain
} = require('../harness/identityHelpers');

const create = (world, key, value) => world.call('claims.claim.create', { key, value }, SUPER);

test('claims are created, listed sorted by key then value, and audited', () => {
  const world = createSuperWorld();
  assert.deepEqual(succeed(create(world, 'b', '2')), { key: 'b', value: '2' });
  succeed(create(world, 'a', '3'));
  succeed(create(world, 'a', '1'));
  assert.deepEqual(succeed(world.call('claims.claim.list', {}, SUPER)).items,
    [{ key: 'a', value: '1' }, { key: 'a', value: '3' }, { key: 'b', value: '2' }]);
  const row = world.rows('claims')[0];
  assert.equal(row.created_by, SUPER);
  assert.equal(row.last_modified_by, SUPER);
  assert.equal(row.created, row.last_modified);
  assert.match(row.created, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+00:00$/);
});

test('claim creation validates the input and refuses duplicates', () => {
  const world = createSuperWorld();
  succeed(create(world, 'k', 'v'));
  failDomain(create(world, 'k', 'v'), 'claim_duplicate');
  failDomain(create(world, 'Bad Key', 'v'), 'claim_key_invalid');
  failDomain(create(world, 'k', ''), 'claim_value_invalid');
  failDomain(create(world, 'k', 'x'.repeat(201)), 'claim_value_invalid');
  failDomain(create(world, 'k', 'a\nb'), 'claim_value_invalid');
  failDomain(world.call('claims.claim.create', { key: 5, value: 'v' }, SUPER), 'invalid_request');
  assert.equal(world.rows('claims').length, 1);
});

test('a claim used by a role or a user cannot be deleted until released', () => {
  const world = createSuperWorld();
  succeed(create(world, 'k', 'v'));
  succeed(create(world, 'u', '1'));
  const role = succeed(world.call('roles.role.create', { name: 'editor', description: '' }, SUPER));
  const user = succeed(world.call('users.user.create', { email: 'x@example.com', active: true }, SUPER));
  succeed(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: 'v' }, SUPER));
  succeed(world.call('users.userClaim.add', { user_id: user.id, key: 'u', value: '1' }, SUPER));
  failDomain(world.call('claims.claim.delete', { key: 'k', value: 'v' }, SUPER), 'claim_in_use');
  failDomain(world.call('claims.claim.delete', { key: 'u', value: '1' }, SUPER), 'claim_in_use');
  succeed(world.call('roles.roleClaim.remove', { role_id: role.id, key: 'k', value: 'v' }, SUPER));
  succeed(world.call('users.userClaim.remove', { user_id: user.id, key: 'u', value: '1' }, SUPER));
  assert.deepEqual(succeed(world.call('claims.claim.delete', { key: 'k', value: 'v' }, SUPER)), {});
  assert.deepEqual(succeed(world.call('claims.claim.delete', { key: 'u', value: '1' }, SUPER)), {});
  assert.equal(world.rows('claims').length, 0);
});

test('deleting a claim that does not exist is NOT_FOUND', () => {
  const world = createSuperWorld();
  failWith(world.call('claims.claim.delete', { key: 'k', value: 'v' }, SUPER), 'NOT_FOUND');
});

test('only the exact (key, value) pair is deleted', () => {
  const world = createSuperWorld();
  succeed(create(world, 'k', '1'));
  succeed(create(world, 'k', '2'));
  succeed(world.call('claims.claim.delete', { key: 'k', value: '1' }, SUPER));
  assert.deepEqual(world.rows('claims').map((row) => row.value), ['2']);
});

test('the claims table holds at most 1000 rows', () => {
  const world = createSuperWorld();
  for (let i = 0; i < 1000; i++) world.addRow('claims', { key: 'many', value: String(i) });
  failDomain(create(world, 'late', '1'), 'limit_exceeded');
});
