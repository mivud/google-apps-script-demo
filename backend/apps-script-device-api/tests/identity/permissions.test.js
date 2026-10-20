'use strict';
// Authorization matrix of identity-api: identity.read / identity.write / super, with exact-match checks.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  SUPER, createSuperWorld, addPermissionUser, succeed, failWith, uuid
} = require('../harness/identityHelpers');

const READER = 'reader@example.com';
const WRITER = 'writer@example.com';
const NOBODY = 'nobody@example.com';
const VICTIM_ID = uuid(50);
const ROLE_ID = uuid(60);

function createMatrixWorld() {
  const world = createSuperWorld();
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, SUPER));
  world.addRow('roles', { id: ROLE_ID, name: 'editor', description: '' });
  world.addRow('users', { id: VICTIM_ID, email: 'victim@example.com', role: '', active: 'TRUE' });
  addPermissionUser(world, READER, 'identity.read', 10);
  addPermissionUser(world, WRITER, 'identity.write', 11);
  world.addRow('users', { id: uuid(12), email: NOBODY, role: '', active: 'TRUE' });
  return world;
}

const READS = [
  ['claims.claim.list', {}],
  ['roles.role.list', {}],
  ['roles.role.get', { id: ROLE_ID }],
  ['users.user.list', {}],
  ['users.user.get', { id: VICTIM_ID }],
  ['access-control.access.preview', { user_id: VICTIM_ID }]
];

const COMMANDS = [
  ['claims.claim.create', { key: 'k2', value: 'v2' }],
  ['claims.claim.delete', { key: 'k', value: 'v' }],
  ['roles.role.create', { name: 'newrole', description: '' }],
  ['roles.role.update', { id: ROLE_ID, name: 'editor2', description: '', expected_last_modified: 'x' }],
  ['roles.role.delete', { id: ROLE_ID }],
  ['roles.roleClaim.add', { role_id: ROLE_ID, key: 'k', value: 'v' }],
  ['roles.roleClaim.remove', { role_id: ROLE_ID, key: 'k', value: 'v' }],
  ['users.user.create', { email: 'new@example.com', active: true }],
  ['users.user.update', { id: VICTIM_ID, email: 'victim@example.com', active: true, expected_last_modified: 'x' }],
  ['users.user.delete', { id: VICTIM_ID }],
  ['users.userRole.assign', { user_id: VICTIM_ID, role_id: ROLE_ID }],
  ['users.userRole.unassign', { user_id: VICTIM_ID, role_id: ROLE_ID }],
  ['users.userClaim.add', { user_id: VICTIM_ID, key: 'k', value: 'v' }],
  ['users.userClaim.remove', { user_id: VICTIM_ID, key: 'k', value: 'v' }]
];

const isForbidden = (response) => !response.ok && response.error.code === 'FORBIDDEN';

// Authorization is checked first, so any answer other than FORBIDDEN (ok, NOT_FOUND, VALIDATION) means it passed.
function assertCommandsAuthorized(world, caller) {
  COMMANDS.forEach(([action, payload]) => {
    const response = world.call(action, payload, caller);
    assert.equal(isForbidden(response), false, `${action}: ${JSON.stringify(response)}`);
  });
}

test('identity.read allows every list/get/preview and forbids every command', () => {
  const world = createMatrixWorld();
  READS.forEach(([action, payload]) => succeed(world.call(action, payload, READER)));
  COMMANDS.forEach(([action, payload]) => failWith(world.call(action, payload, READER), 'FORBIDDEN'));
});

test('identity.write passes authorization for commands but does not imply read', () => {
  const world = createMatrixWorld();
  READS.forEach(([action, payload]) => failWith(world.call(action, payload, WRITER), 'FORBIDDEN'));
  assertCommandsAuthorized(world, WRITER);
});

test('a caller with neither permission is forbidden everywhere', () => {
  const world = createMatrixWorld();
  [...READS, ...COMMANDS].forEach(([action, payload]) => failWith(world.call(action, payload, NOBODY), 'FORBIDDEN'));
});

test('super passes every read and every command authorization', () => {
  const world = createMatrixWorld();
  READS.forEach(([action, payload]) => succeed(world.call(action, payload, SUPER)));
  assertCommandsAuthorized(world, SUPER);
});

test('look-alike roles and permission claims are not enough (exact match)', () => {
  const world = createMatrixWorld();
  const impostors = [
    { email: 'role-super-title@example.com', roleName: 'Super' },
    { email: 'role-super-upper@example.com', roleName: 'SUPER' },
    { email: 'case@example.com', claim: { key: 'permission', value: 'Identity.Write' } },
    { email: 'key@example.com', claim: { key: 'Permission', value: 'identity.write' } },
    { email: 'otherkey@example.com', claim: { key: 'perm', value: 'identity.write' } },
    { email: 'space@example.com', claim: { key: 'permission', value: 'identity.write ' } },
    { email: 'prefix@example.com', claim: { key: 'permission', value: 'identity.writer' } },
    { email: 'readcase@example.com', claim: { key: 'permission', value: 'IDENTITY.READ' } }
  ];
  impostors.forEach(({ email, claim, roleName }, index) => {
    const rowId = uuid(100 + index);
    world.addRow('users', { id: rowId, email, role: '', active: 'TRUE' });
    if (claim) world.addRow('user_claims', { user_id: rowId, key: claim.key, value: claim.value });
    if (roleName) {
      const roleId = uuid(200 + index);
      world.addRow('roles', { id: roleId, name: roleName, description: '' });
      world.addRow('user_roles', { user_id: rowId, role_id: roleId });
    }
    failWith(world.call('users.user.list', {}, email), 'FORBIDDEN');
    failWith(world.call('claims.claim.create', { key: 'k9', value: 'v9' }, email), 'FORBIDDEN');
  });
  assert.equal(world.rows('claims').some((row) => row.key === 'k9'), false);
});
