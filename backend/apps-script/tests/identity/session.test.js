'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld } = require('../harness/identityWorld');
const {
  ADMIN, createLegacyAdminWorld, succeed, failWith, roleIdOf, uuid
} = require('../harness/identityHelpers');

const NONCE = 'nonce-value-123456';

const signIn = (world, email, nonce = NONCE) => world.call('auth.session.get', { nonce }, world.tokenFor(email, nonce));

test('legacy admin signs in through the users.role fallback with roles and claims', () => {
  const world = createLegacyAdminWorld();
  assert.deepEqual(succeed(signIn(world, ADMIN)), { email: ADMIN, role: 'admin', roles: ['admin'], claims: [] });
});

test('auth.access.resolve returns the same shape without a nonce', () => {
  const world = createLegacyAdminWorld();
  world.addRow('users', { id: uuid(902), email: 'view@example.com', role: 'Viewer', active: 'true' });
  assert.deepEqual(succeed(world.call('auth.access.resolve', {}, 'view@example.com')),
    { email: 'view@example.com', role: 'viewer', roles: ['viewer'], claims: [] });
});

test('explicit roles replace the legacy column and bring role and own claims', () => {
  const world = createLegacyAdminWorld();
  succeed(world.call('claims.claim.create', { key: 'feature', value: 'beta' }, ADMIN));
  succeed(world.call('claims.claim.create', { key: 'team', value: 'ops' }, ADMIN));
  const created = succeed(world.call('users.user.create', { email: 'dev@example.com', active: true }, ADMIN));
  succeed(world.call('users.userRole.assign', { user_id: created.id, role_id: roleIdOf(world, 'viewer') }, ADMIN));
  const viewerId = roleIdOf(world, 'viewer');
  succeed(world.call('roles.roleClaim.add', { role_id: viewerId, key: 'feature', value: 'beta' }, ADMIN));
  succeed(world.call('users.userClaim.add', { user_id: created.id, key: 'team', value: 'ops' }, ADMIN));
  assert.deepEqual(succeed(world.call('auth.access.resolve', {}, 'dev@example.com')), {
    email: 'dev@example.com',
    role: 'viewer',
    roles: ['viewer'],
    claims: [{ key: 'feature', value: 'beta' }, { key: 'team', value: 'ops' }]
  });
});

test('unknown, inactive and role-less users are FORBIDDEN', () => {
  const world = createLegacyAdminWorld();
  world.addRow('users', { id: uuid(902), email: 'old@example.com', role: 'viewer', active: 'FALSE' });
  world.addRow('users', { id: uuid(903), email: 'norole@example.com', role: 'owner', active: 'TRUE' });
  ['nobody@example.com', 'old@example.com', 'norole@example.com'].forEach((email) => {
    failWith(signIn(world, email), 'FORBIDDEN');
  });
});

test('a user whose roles do not include admin or viewer is FORBIDDEN', () => {
  const world = createLegacyAdminWorld();
  const role = succeed(world.call('roles.role.create', { name: 'editor', description: '' }, ADMIN));
  const user = succeed(world.call('users.user.create', { email: 'ed@example.com', active: true, role_ids: [role.id] }, ADMIN));
  assert.equal(user.role_ids[0], role.id);
  failWith(signIn(world, 'ed@example.com'), 'FORBIDDEN');
});

test('sign-in refuses a token bound to another nonce, a bad nonce shape and an unknown token', () => {
  const world = createLegacyAdminWorld();
  failWith(world.call('auth.session.get', { nonce: NONCE }, world.tokenFor(ADMIN, 'another-nonce-123456')), 'UNAUTHORIZED');
  failWith(world.call('auth.session.get', { nonce: NONCE }, world.tokenFor(ADMIN, '')), 'UNAUTHORIZED');
  failWith(world.call('auth.session.get', { nonce: 'short' }, world.tokenFor(ADMIN, 'short')), 'UNAUTHORIZED');
  failWith(world.call('auth.session.get', { nonce: NONCE }, 'garbage'), 'UNAUTHORIZED');
  failWith(world.call('auth.access.resolve', {}, 'garbage'), 'UNAUTHORIZED');
});

test('sign-in works with no roles sheet content yet and runs without the write lock', () => {
  const world = createWorld();
  world.addRow('users', { id: uuid(902), email: ADMIN, role: 'admin', active: 'TRUE' });
  const before = world.lock.runs;
  succeed(signIn(world, ADMIN));
  assert.equal(world.lock.runs, before);
  assert.equal(world.rows('roles').length, 0);
});
