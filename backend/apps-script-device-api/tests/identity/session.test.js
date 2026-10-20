'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld } = require('../harness/identityWorld');
const {
  SUPER, SUPER_ROLE_ID, createSuperWorld, succeed, failWith, uuid
} = require('../harness/identityHelpers');

const NONCE = 'nonce-value-123456';

const signIn = (world, email, nonce = NONCE) => world.call('auth.session.get', { nonce }, world.tokenFor(email, nonce));

test('a super signs in with the super role, role name and claims', () => {
  const world = createSuperWorld();
  assert.deepEqual(succeed(signIn(world, SUPER)), { email: SUPER, role: 'super', roles: ['super'], claims: [] });
});

test('auth.access.resolve returns the same shape without a nonce; the role may be any name', () => {
  const world = createSuperWorld();
  const role = succeed(world.call('roles.role.create', { name: 'reviewer', description: '' }, SUPER));
  succeed(world.call('users.user.create', { email: 'view@example.com', active: true, role_ids: [role.id] }, SUPER));
  assert.deepEqual(succeed(world.call('auth.access.resolve', {}, 'view@example.com')),
    { email: 'view@example.com', role: 'reviewer', roles: ['reviewer'], claims: [] });
});

test('role claims are additive; a user claim only removes the identical role claim', () => {
  const world = createSuperWorld();
  [['feature', 'beta'], ['feature', 'gamma'], ['team', 'ops']].forEach(([key, value]) => {
    succeed(world.call('claims.claim.create', { key, value }, SUPER));
  });
  const role = succeed(world.call('roles.role.create', { name: 'dev', description: '' }, SUPER));
  const created = succeed(world.call('users.user.create', { email: 'dev@example.com', active: true, role_ids: [role.id] }, SUPER));
  succeed(world.call('roles.roleClaim.add', { role_id: role.id, key: 'feature', value: 'beta' }, SUPER));
  succeed(world.call('users.userClaim.add', { user_id: created.id, key: 'feature', value: 'beta' }, SUPER));
  succeed(world.call('users.userClaim.add', { user_id: created.id, key: 'feature', value: 'gamma' }, SUPER));
  succeed(world.call('users.userClaim.add', { user_id: created.id, key: 'team', value: 'ops' }, SUPER));
  assert.deepEqual(succeed(world.call('auth.access.resolve', {}, 'dev@example.com')), {
    email: 'dev@example.com',
    role: 'dev',
    roles: ['dev'],
    claims: [{ key: 'feature', value: 'beta' }, { key: 'feature', value: 'gamma' }, { key: 'team', value: 'ops' }]
  });
});

test('unknown and inactive users are FORBIDDEN', () => {
  const world = createSuperWorld();
  world.addRow('users', { id: uuid(902), email: 'old@example.com', role: '', active: 'FALSE' });
  world.addRow('user_roles', { user_id: uuid(902), role_id: SUPER_ROLE_ID });
  ['nobody@example.com', 'old@example.com'].forEach((email) => {
    failWith(signIn(world, email), 'FORBIDDEN');
  });
});

test('a known active user with no roles and no claims still signs in (the client shows no apps)', () => {
  const world = createSuperWorld();
  world.addRow('users', { id: uuid(903), email: 'norole@example.com', role: 'owner', active: 'TRUE' });
  assert.deepEqual(succeed(signIn(world, 'norole@example.com')), { email: 'norole@example.com', role: '', roles: [], claims: [] });
});

test('sign-in refuses a token bound to another nonce, a bad nonce shape and an unknown token', () => {
  const world = createSuperWorld();
  failWith(world.call('auth.session.get', { nonce: NONCE }, world.tokenFor(SUPER, 'another-nonce-123456')), 'UNAUTHORIZED');
  failWith(world.call('auth.session.get', { nonce: NONCE }, world.tokenFor(SUPER, '')), 'UNAUTHORIZED');
  failWith(world.call('auth.session.get', { nonce: 'short' }, world.tokenFor(SUPER, 'short')), 'UNAUTHORIZED');
  failWith(world.call('auth.session.get', { nonce: NONCE }, 'garbage'), 'UNAUTHORIZED');
  failWith(world.call('auth.access.resolve', {}, 'garbage'), 'UNAUTHORIZED');
});

test('sign-in works with no roles sheet content yet and runs without the write lock', () => {
  const world = createWorld();
  world.addRow('users', { id: uuid(902), email: SUPER, role: '', active: 'TRUE' });
  const before = world.lock.runs;
  succeed(signIn(world, SUPER));
  assert.equal(world.lock.runs, before);
  assert.equal(world.rows('roles').length, 0);
});
