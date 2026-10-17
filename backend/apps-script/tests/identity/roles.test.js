'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  ADMIN, SECOND_ADMIN, createLegacyAdminWorld, succeed, failWith, failDomain, roleIdOf, addSecondAdmin, uuid
} = require('../harness/identityHelpers');

const createRole = (world, name, description = '', as = ADMIN) => world.call('roles.role.create', { name, description }, as);

test('built-in roles are seeded once, by system, on the first write', () => {
  const world = createLegacyAdminWorld();
  assert.equal(world.rows('roles').length, 0);
  succeed(createRole(world, 'editor'));
  succeed(createRole(world, 'writer'));
  const rows = world.rows('roles');
  assert.deepEqual(rows.map((row) => row.name).sort(), ['admin', 'editor', 'viewer', 'writer']);
  rows.filter((row) => ['admin', 'viewer'].includes(row.name)).forEach((row) => {
    assert.equal(row.created_by, 'system');
    assert.equal(row.last_modified_by, 'system');
  });
});

test('role creation returns the role with audit fields taken from the token, not the payload', () => {
  const world = createLegacyAdminWorld();
  const role = succeed(world.call('roles.role.create', {
    name: 'editor', description: 'Edits', created_by: 'evil', last_modified_by: 'evil', created: '1999', last_modified: '1999'
  }, ADMIN));
  assert.equal(role.created_by, ADMIN);
  assert.equal(role.last_modified_by, ADMIN);
  assert.notEqual(role.created, '1999');
  assert.deepEqual({ name: role.name, description: role.description, claims: role.claims }, { name: 'editor', description: 'Edits', claims: [] });
  assert.deepEqual(succeed(world.call('roles.role.get', { id: role.id }, ADMIN)), role);
});

test('role names and descriptions are validated, duplicates refused case-insensitively', () => {
  const world = createLegacyAdminWorld();
  ['A', 'x', 'Has Space', '1abc', 'a'.repeat(33)].forEach((name) => failDomain(createRole(world, name), 'role_name_invalid'));
  failDomain(createRole(world, 'editor', 'x'.repeat(201)), 'role_description_invalid');
  failDomain(world.call('roles.role.create', { name: 7, description: '' }, ADMIN), 'invalid_request');
  succeed(createRole(world, 'editor'));
  failDomain(createRole(world, 'editor'), 'role_name_duplicate');
  world.addRow('roles', { id: uuid(950), name: 'Reviewer', description: '' });
  failDomain(createRole(world, 'reviewer'), 'role_name_duplicate');
});

test('role list is sorted by name and includes claims', () => {
  const world = createLegacyAdminWorld();
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, ADMIN));
  const role = succeed(createRole(world, 'editor'));
  const withClaim = succeed(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: 'v' }, ADMIN));
  assert.deepEqual(withClaim.claims, [{ key: 'k', value: 'v' }]);
  const items = succeed(world.call('roles.role.list', {}, ADMIN)).items;
  assert.deepEqual(items.map((item) => item.name), ['admin', 'editor', 'viewer']);
  assert.deepEqual(items[1].claims, [{ key: 'k', value: 'v' }]);
});

test('update uses optimistic concurrency and stamps the modifying admin', () => {
  const world = createLegacyAdminWorld();
  const role = succeed(createRole(world, 'editor'));
  const stale = role.last_modified;
  const updated = succeed(world.call('roles.role.update', {
    id: role.id, name: 'writer', description: 'New', expected_last_modified: stale
  }, ADMIN));
  assert.equal(updated.name, 'writer');
  assert.notEqual(updated.last_modified, stale);
  assert.equal(updated.created, role.created);
  const second = addSecondAdmin(world);
  assert.ok(second.id);
  failDomain(world.call('roles.role.update', {
    id: role.id, name: 'other', description: '', expected_last_modified: stale
  }, SECOND_ADMIN), 'conflict');
  const again = succeed(world.call('roles.role.update', {
    id: role.id, name: 'other', description: '', expected_last_modified: updated.last_modified
  }, SECOND_ADMIN));
  assert.equal(again.last_modified_by, SECOND_ADMIN);
  assert.equal(again.created_by, ADMIN);
});

test('update refuses a name taken by another role but allows keeping its own', () => {
  const world = createLegacyAdminWorld();
  const first = succeed(createRole(world, 'editor'));
  succeed(createRole(world, 'writer'));
  failDomain(world.call('roles.role.update', {
    id: first.id, name: 'writer', description: '', expected_last_modified: first.last_modified
  }, ADMIN), 'role_name_duplicate');
  succeed(world.call('roles.role.update', {
    id: first.id, name: 'editor', description: 'same name', expected_last_modified: first.last_modified
  }, ADMIN));
});

test('built-in roles cannot be renamed or deleted', () => {
  const world = createLegacyAdminWorld();
  succeed(createRole(world, 'editor'));
  const admin = succeed(world.call('roles.role.get', { id: roleIdOf(world, 'admin') }, ADMIN));
  failDomain(world.call('roles.role.update', {
    id: admin.id, name: 'boss', description: '', expected_last_modified: admin.last_modified
  }, ADMIN), 'role_protected');
  failDomain(world.call('roles.role.delete', { id: admin.id }, ADMIN), 'role_protected');
  failDomain(world.call('roles.role.delete', { id: roleIdOf(world, 'viewer') }, ADMIN), 'role_protected');
  succeed(world.call('roles.role.update', {
    id: admin.id, name: 'admin', description: 'Everything', expected_last_modified: admin.last_modified
  }, ADMIN));
});

test('a role assigned to a user cannot be deleted; deleting a role removes its claims', () => {
  const world = createLegacyAdminWorld();
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, ADMIN));
  const role = succeed(createRole(world, 'editor'));
  const other = succeed(createRole(world, 'writer'));
  succeed(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: 'v' }, ADMIN));
  succeed(world.call('roles.roleClaim.add', { role_id: other.id, key: 'k', value: 'v' }, ADMIN));
  const user = succeed(world.call('users.user.create', { email: 'x@example.com', active: true, role_ids: [role.id] }, ADMIN));
  failDomain(world.call('roles.role.delete', { id: role.id }, ADMIN), 'role_in_use');
  succeed(world.call('users.userRole.unassign', { user_id: user.id, role_id: role.id }, ADMIN));
  assert.deepEqual(succeed(world.call('roles.role.delete', { id: role.id }, ADMIN)), {});
  assert.deepEqual(world.rows('role_claims').map((row) => row.role_id), [other.id]);
  failWith(world.call('roles.role.get', { id: role.id }, ADMIN), 'NOT_FOUND');
});

test('role claims: unknown claims are refused, add and remove are idempotent', () => {
  const world = createLegacyAdminWorld();
  const role = succeed(createRole(world, 'editor'));
  failDomain(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: 'v' }, ADMIN), 'claim_unknown');
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, ADMIN));
  succeed(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: 'v' }, ADMIN));
  succeed(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: 'v' }, ADMIN));
  assert.equal(world.rows('role_claims').length, 1);
  const row = world.rows('role_claims')[0];
  assert.equal(row.created_by, ADMIN);
  const removed = succeed(world.call('roles.roleClaim.remove', { role_id: role.id, key: 'k', value: 'v' }, ADMIN));
  assert.deepEqual(removed.claims, []);
  succeed(world.call('roles.roleClaim.remove', { role_id: role.id, key: 'k', value: 'v' }, ADMIN));
  assert.equal(world.rows('role_claims').length, 0);
});

test('a role holds at most 100 claims', () => {
  const world = createLegacyAdminWorld();
  const role = succeed(createRole(world, 'editor'));
  for (let i = 0; i < 101; i++) {
    world.addRow('claims', { key: 'k', value: String(i) });
    if (i < 100) world.addRow('role_claims', { role_id: role.id, key: 'k', value: String(i) });
  }
  failDomain(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: '100' }, ADMIN), 'limit_exceeded');
});

test('role ids that are malformed or missing are NOT_FOUND', () => {
  const world = createLegacyAdminWorld();
  failWith(world.call('roles.role.get', { id: 'not-a-uuid' }, ADMIN), 'NOT_FOUND');
  failWith(world.call('roles.role.get', { id: uuid(777) }, ADMIN), 'NOT_FOUND');
  failWith(world.call('roles.role.delete', { id: uuid(777) }, ADMIN), 'NOT_FOUND');
  failWith(world.call('roles.roleClaim.remove', { role_id: uuid(777), key: 'k', value: 'v' }, ADMIN), 'NOT_FOUND');
});

test('the roles table holds at most 1000 rows', () => {
  const world = createLegacyAdminWorld();
  succeed(createRole(world, 'editor'));
  for (let i = world.rows('roles').length; i < 1000; i++) world.addRow('roles', { id: uuid(3000 + i), name: `r${i}`, description: '' });
  failDomain(createRole(world, 'late'), 'limit_exceeded');
});

test('role claim changes stamp the role row with the caller email', () => {
  const world = createLegacyAdminWorld();
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, ADMIN));
  const role = succeed(createRole(world, 'editor'));
  const row = () => world.rows('roles').find((candidate) => candidate.id === role.id);
  [['roles.roleClaim.add'], ['roles.roleClaim.remove']].forEach(([action]) => {
    const before = row().last_modified;
    const result = succeed(world.call(action, { role_id: role.id, key: 'k', value: 'v' }, ADMIN));
    assert.notEqual(row().last_modified, before);
    assert.equal(result.last_modified, row().last_modified);
    assert.equal(row().last_modified_by, ADMIN);
  });
});
