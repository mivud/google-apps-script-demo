'use strict';
// Super lockout end to end: claims and look-alike roles never count as super.
const { test } = require('node:test');
const {
  SUPER, SUPER_ROW_ID, SUPER_ROLE_ID, createSuperWorld, addPermissionUser, failDomain, succeed, uuid
} = require('../harness/identityHelpers');

const ADMIN = 'admin@example.com';
const ADMIN_ROW = 10;

// An identity.write admin who looks like a second super through claims and a differently cased role.
function createWorldWithFakeSupers() {
  const world = createSuperWorld();
  addPermissionUser(world, ADMIN, 'identity.write', ADMIN_ROW);
  world.addRow('user_claims', { user_id: uuid(ADMIN_ROW), key: 'role', value: 'super' });
  world.addRow('user_claims', { user_id: uuid(ADMIN_ROW), key: 'permission', value: 'super' });
  world.addRow('roles', { id: uuid(300), name: 'Super', description: '' });
  world.addRow('user_roles', { user_id: uuid(ADMIN_ROW), role_id: uuid(300) });
  return world;
}

test('claims and a differently cased role do not count as a second super', () => {
  const world = createWorldWithFakeSupers();
  failDomain(world.call('users.user.delete', { id: SUPER_ROW_ID }, ADMIN), 'last_super');
  failDomain(world.call('users.userRole.unassign', { user_id: SUPER_ROW_ID, role_id: SUPER_ROLE_ID }, ADMIN), 'last_super');
  const loaded = succeed(world.call('users.user.get', { id: SUPER_ROW_ID }, SUPER));
  failDomain(world.call('users.user.update', {
    id: SUPER_ROW_ID, email: SUPER, active: false, expected_last_modified: loaded.last_modified
  }, ADMIN), 'last_super');
});

test('the last super still cannot delete themself while fake supers exist', () => {
  const world = createWorldWithFakeSupers();
  failDomain(world.call('users.user.delete', { id: SUPER_ROW_ID }, SUPER), 'last_super');
});
