'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  SUPER, SECOND_SUPER, createSuperWorld, addPermissionUser, succeed, failWith, failDomain, roleIdOf, addSecondSuper, uuid
} = require('../harness/identityHelpers');
const { createWorld } = require('../harness/identityWorld');

const createRole = (world, name, description = '', as = SUPER) => world.call('roles.role.create', { name, description }, as);

test('the built-in super role is seeded once, by system, on the first write', () => {  const world = createWorld();  addPermissionUser(world, SUPER, 'identity.write', 910);  assert.equal(world.rows('roles').length, 0);  succeed(createRole(world, 'editor'));  succeed(createRole(world, 'writer'));  const rows = world.rows('roles');  assert.deepEqual(rows.map((row) => row.name).sort(), ['editor', 'super', 'writer']);  rows.filter((row) => row.name === 'super').forEach((row) => {    assert.equal(row.created_by, 'system');    assert.equal(row.last_modified_by, 'system');  });});

test('role creation returns the role with audit fields taken from the token, not the payload', () => {
  const world = createSuperWorld();
  const role = succeed(world.call('roles.role.create', {
    name: 'editor', description: 'Edits', created_by: 'evil', last_modified_by: 'evil', created: '1999', last_modified: '1999'
  }, SUPER));
  assert.equal(role.created_by, SUPER);
  assert.equal(role.last_modified_by, SUPER);
  assert.notEqual(role.created, '1999');
  assert.deepEqual({ name: role.name, description: role.description, claims: role.claims }, { name: 'editor', description: 'Edits', claims: [] });
  assert.deepEqual(succeed(world.call('roles.role.get', { id: role.id }, SUPER)), role);
});

test('role names and descriptions are validated, duplicates refused case-insensitively', () => {
  const world = createSuperWorld();
  ['A', 'x', 'Has Space', '1abc', 'a'.repeat(33)].forEach((name) => failDomain(createRole(world, name), 'role_name_invalid'));
  failDomain(createRole(world, 'editor', 'x'.repeat(201)), 'role_description_invalid');
  failDomain(world.call('roles.role.create', { name: 7, description: '' }, SUPER), 'invalid_request');
  succeed(createRole(world, 'editor'));
  failDomain(createRole(world, 'editor'), 'role_name_duplicate');
  world.addRow('roles', { id: uuid(950), name: 'Reviewer', description: '' });
  failDomain(createRole(world, 'reviewer'), 'role_name_duplicate');
});

test('role list is sorted by name and includes claims', () => {
  const world = createSuperWorld();
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, SUPER));
  const role = succeed(createRole(world, 'editor'));
  const withClaim = succeed(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: 'v' }, SUPER));
  assert.deepEqual(withClaim.claims, [{ key: 'k', value: 'v' }]);
  const items = succeed(world.call('roles.role.list', {}, SUPER)).items;
  assert.deepEqual(items.map((item) => item.name), ['editor', 'super']);
  assert.deepEqual(items[0].claims, [{ key: 'k', value: 'v' }]);
});

test('update uses optimistic concurrency and stamps the modifying super', () => {
  const world = createSuperWorld();
  const role = succeed(createRole(world, 'editor'));
  const stale = role.last_modified;
  const updated = succeed(world.call('roles.role.update', {
    id: role.id, name: 'writer', description: 'New', expected_last_modified: stale
  }, SUPER));
  assert.equal(updated.name, 'writer');
  assert.notEqual(updated.last_modified, stale);
  assert.equal(updated.created, role.created);
  const second = addSecondSuper(world);
  assert.ok(second.id);
  failDomain(world.call('roles.role.update', {
    id: role.id, name: 'other', description: '', expected_last_modified: stale
  }, SECOND_SUPER), 'conflict');
  const again = succeed(world.call('roles.role.update', {
    id: role.id, name: 'other', description: '', expected_last_modified: updated.last_modified
  }, SECOND_SUPER));
  assert.equal(again.last_modified_by, SECOND_SUPER);
  assert.equal(again.created_by, SUPER);
});

test('update refuses a name taken by another role but allows keeping its own', () => {
  const world = createSuperWorld();
  const first = succeed(createRole(world, 'editor'));
  succeed(createRole(world, 'writer'));
  failDomain(world.call('roles.role.update', {
    id: first.id, name: 'writer', description: '', expected_last_modified: first.last_modified
  }, SUPER), 'role_name_duplicate');
  succeed(world.call('roles.role.update', {
    id: first.id, name: 'editor', description: 'same name', expected_last_modified: first.last_modified
  }, SUPER));
});

test('built-in roles cannot be renamed or deleted', () => {
  const world = createSuperWorld();
  succeed(createRole(world, 'editor'));
  const superRole = succeed(world.call('roles.role.get', { id: roleIdOf(world, 'super') }, SUPER));
  failDomain(world.call('roles.role.update', {
    id: superRole.id, name: 'boss', description: '', expected_last_modified: superRole.last_modified
  }, SUPER), 'role_protected');
  failDomain(world.call('roles.role.delete', { id: superRole.id }, SUPER), 'role_protected');
  succeed(world.call('roles.role.update', {
    id: superRole.id, name: 'super', description: 'Everything', expected_last_modified: superRole.last_modified
  }, SUPER));
});

test('a role assigned to a user cannot be deleted; deleting a role removes its claims', () => {
  const world = createSuperWorld();
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, SUPER));
  const role = succeed(createRole(world, 'editor'));
  const other = succeed(createRole(world, 'writer'));
  succeed(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: 'v' }, SUPER));
  succeed(world.call('roles.roleClaim.add', { role_id: other.id, key: 'k', value: 'v' }, SUPER));
  const user = succeed(world.call('users.user.create', { email: 'x@example.com', active: true, role_ids: [role.id] }, SUPER));
  failDomain(world.call('roles.role.delete', { id: role.id }, SUPER), 'role_in_use');
  succeed(world.call('users.userRole.unassign', { user_id: user.id, role_id: role.id }, SUPER));
  assert.deepEqual(succeed(world.call('roles.role.delete', { id: role.id }, SUPER)), {});
  assert.deepEqual(world.rows('role_claims').map((row) => row.role_id), [other.id]);
  failWith(world.call('roles.role.get', { id: role.id }, SUPER), 'NOT_FOUND');
});

test('role claims: unknown claims are refused, add and remove are idempotent', () => {
  const world = createSuperWorld();
  const role = succeed(createRole(world, 'editor'));
  failDomain(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: 'v' }, SUPER), 'claim_unknown');
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, SUPER));
  succeed(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: 'v' }, SUPER));
  succeed(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: 'v' }, SUPER));
  assert.equal(world.rows('role_claims').length, 1);
  const row = world.rows('role_claims')[0];
  assert.equal(row.created_by, SUPER);
  const removed = succeed(world.call('roles.roleClaim.remove', { role_id: role.id, key: 'k', value: 'v' }, SUPER));
  assert.deepEqual(removed.claims, []);
  succeed(world.call('roles.roleClaim.remove', { role_id: role.id, key: 'k', value: 'v' }, SUPER));
  assert.equal(world.rows('role_claims').length, 0);
});

test('a role holds at most 100 claims', () => {
  const world = createSuperWorld();
  const role = succeed(createRole(world, 'editor'));
  for (let i = 0; i < 101; i++) {
    world.addRow('claims', { key: 'k', value: String(i) });
    if (i < 100) world.addRow('role_claims', { role_id: role.id, key: 'k', value: String(i) });
  }
  failDomain(world.call('roles.roleClaim.add', { role_id: role.id, key: 'k', value: '100' }, SUPER), 'limit_exceeded');
});

test('role ids that are malformed or missing are NOT_FOUND', () => {
  const world = createSuperWorld();
  failWith(world.call('roles.role.get', { id: 'not-a-uuid' }, SUPER), 'NOT_FOUND');
  failWith(world.call('roles.role.get', { id: uuid(777) }, SUPER), 'NOT_FOUND');
  failWith(world.call('roles.role.delete', { id: uuid(777) }, SUPER), 'NOT_FOUND');
  failWith(world.call('roles.roleClaim.remove', { role_id: uuid(777), key: 'k', value: 'v' }, SUPER), 'NOT_FOUND');
});

test('the roles table holds at most 1000 rows', () => {
  const world = createSuperWorld();
  succeed(createRole(world, 'editor'));
  for (let i = world.rows('roles').length; i < 1000; i++) world.addRow('roles', { id: uuid(3000 + i), name: `r${i}`, description: '' });
  failDomain(createRole(world, 'late'), 'limit_exceeded');
});

test('role claim changes stamp the role row with the caller email', () => {
  const world = createSuperWorld();
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, SUPER));
  const role = succeed(createRole(world, 'editor'));
  const row = () => world.rows('roles').find((candidate) => candidate.id === role.id);
  [['roles.roleClaim.add'], ['roles.roleClaim.remove']].forEach(([action]) => {
    const before = row().last_modified;
    const result = succeed(world.call(action, { role_id: role.id, key: 'k', value: 'v' }, SUPER));
    assert.notEqual(row().last_modified, before);
    assert.equal(result.last_modified, row().last_modified);
    assert.equal(row().last_modified_by, SUPER);
  });
});
