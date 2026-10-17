'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld } = require('../harness/identityWorld');
const {
  ADMIN, SECOND_ADMIN, createLegacyAdminWorld, succeed, failWith, failDomain, roleIdOf, addSecondAdmin, uuid
} = require('../harness/identityHelpers');

const createUser = (world, email, extra = {}, as = ADMIN) =>
  world.call('users.user.create', { email, active: true, ...extra }, as);
// One admin whose admin role is an explicit assignment (users.role empty), plus the built-in roles.
function createWorldWithExplicitAdmin() {
  const world = createWorld();
  world.addRow('roles', { id: uuid(701), name: 'admin', description: '' });
  world.addRow('roles', { id: uuid(702), name: 'viewer', description: '' });
  world.addRow('users', { id: uuid(903), email: ADMIN, role: '', active: 'TRUE' });
  world.addRow('user_roles', { user_id: uuid(903), role_id: uuid(701) });
  return world;
}
const adminUserId = (world) => world.rows('users').find((row) => row.email === ADMIN).id;

test('user creation normalizes the email, assigns roles and audits with the token email', () => {
  const world = createLegacyAdminWorld();
  succeed(world.call('roles.role.create', { name: 'editor', description: '' }, ADMIN));
  const viewerId = roleIdOf(world, 'viewer');
  const user = succeed(createUser(world, ' Bob@Example.COM ', {
    role_ids: [viewerId, viewerId], created_by: 'evil', last_modified_by: 'evil'
  }));
  assert.equal(user.email, 'bob@example.com');
  assert.equal(user.active, true);
  assert.deepEqual(user.role_ids, [viewerId]);
  assert.deepEqual(user.claims, []);
  assert.equal(user.created_by, ADMIN);
  assert.equal(user.last_modified_by, ADMIN);
  const row = world.rows('users').find((candidate) => candidate.id === user.id);
  assert.equal(row.role, '');
  assert.equal(row.active, 'TRUE');
  const assignment = world.rows('user_roles')[0];
  assert.deepEqual({ user_id: assignment.user_id, role_id: assignment.role_id, created_by: assignment.created_by },
    { user_id: user.id, role_id: viewerId, created_by: ADMIN });
  assert.deepEqual(succeed(world.call('users.user.get', { id: user.id }, ADMIN)), user);
});

test('user input rules: email shape, duplicates, unknown roles, role limit, types', () => {
  const world = createLegacyAdminWorld();
  failDomain(createUser(world, 'not-an-email'), 'user_email_invalid');
  succeed(createUser(world, 'bob@example.com'));
  failDomain(createUser(world, 'BOB@example.com'), 'user_email_duplicate');
  failWith(createUser(world, 'carl@example.com', { role_ids: [uuid(777)] }), 'NOT_FOUND');
  const tooMany = Array.from({ length: 21 }, (_v, i) => uuid(800 + i));
  failDomain(createUser(world, 'many@example.com', { role_ids: tooMany }), 'limit_exceeded');
  failDomain(world.call('users.user.create', { email: 'x@example.com', active: 'yes' }, ADMIN), 'invalid_request');
  failDomain(createUser(world, 'x@example.com', { role_ids: 'r' }), 'invalid_request');
  assert.equal(world.rows('users').length, 2);
});

test('user list returns every user with role ids and own claims', () => {
  const world = createLegacyAdminWorld();
  succeed(createUser(world, 'bob@example.com'));
  const items = succeed(world.call('users.user.list', {}, ADMIN)).items;
  assert.deepEqual(items.map((item) => item.email), [ADMIN, 'bob@example.com']);
  assert.deepEqual(items[0].role_ids, []);
});

test('update uses optimistic concurrency, rejects duplicate emails and stamps the modifier', () => {
  const world = createLegacyAdminWorld();
  const bob = succeed(createUser(world, 'bob@example.com'));
  const carl = succeed(createUser(world, 'carl@example.com'));
  failDomain(world.call('users.user.update', {
    id: bob.id, email: 'carl@example.com', active: true, expected_last_modified: bob.last_modified
  }, ADMIN), 'user_email_duplicate');
  const updated = succeed(world.call('users.user.update', {
    id: bob.id, email: 'robert@example.com', active: false, expected_last_modified: bob.last_modified
  }, ADMIN));
  assert.equal(updated.email, 'robert@example.com');
  assert.equal(updated.active, false);
  assert.equal(world.rows('users').find((row) => row.id === bob.id).active, 'FALSE');
  failDomain(world.call('users.user.update', {
    id: bob.id, email: 'robert@example.com', active: true, expected_last_modified: bob.last_modified
  }, ADMIN), 'conflict');
  assert.ok(carl.id);
});

test('updating a legacy user keeps the legacy role column so access is not lost', () => {
  const world = createLegacyAdminWorld();
  addSecondAdmin(world);
  world.addRow('users', { id: uuid(903), email: 'old@example.com', role: 'viewer', active: 'TRUE' });
  const old = succeed(world.call('users.user.get', { id: uuid(903) }, ADMIN));
  succeed(world.call('users.user.update', {
    id: old.id, email: 'old@example.com', active: true, expected_last_modified: old.last_modified
  }, ADMIN));
  assert.equal(world.rows('users').find((row) => row.id === old.id).role, 'viewer');
  assert.equal(succeed(world.call('auth.access.resolve', {}, 'old@example.com')).role, 'viewer');
});

test('role assignment is idempotent, audited and limited to 20 roles', () => {
  const world = createLegacyAdminWorld();
  const user = succeed(createUser(world, 'bob@example.com'));
  const viewerId = roleIdOf(world, 'viewer');
  const first = succeed(world.call('users.userRole.assign', { user_id: user.id, role_id: viewerId }, ADMIN));
  succeed(world.call('users.userRole.assign', { user_id: user.id, role_id: viewerId }, ADMIN));
  assert.deepEqual(first.role_ids, [viewerId]);
  assert.equal(world.rows('user_roles').length, 1);
  assert.equal(world.rows('user_roles')[0].created_by, ADMIN);
  failWith(world.call('users.userRole.assign', { user_id: user.id, role_id: uuid(777) }, ADMIN), 'NOT_FOUND');
  for (let i = 0; i < 19; i++) world.addRow('user_roles', { user_id: user.id, role_id: uuid(600 + i) });
  const extra = succeed(world.call('roles.role.create', { name: 'extra', description: '' }, ADMIN));
  failDomain(world.call('users.userRole.assign', { user_id: user.id, role_id: extra.id }, ADMIN), 'limit_exceeded');
  const removed = succeed(world.call('users.userRole.unassign', { user_id: user.id, role_id: viewerId }, ADMIN));
  assert.equal(removed.role_ids.includes(viewerId), false);
  succeed(world.call('users.userRole.unassign', { user_id: user.id, role_id: viewerId }, ADMIN));
});

test('own claims need a catalog claim, are idempotent and limited to 100', () => {
  const world = createLegacyAdminWorld();
  const user = succeed(createUser(world, 'bob@example.com'));
  failDomain(world.call('users.userClaim.add', { user_id: user.id, key: 'k', value: 'v' }, ADMIN), 'claim_unknown');
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, ADMIN));
  succeed(world.call('users.userClaim.add', { user_id: user.id, key: 'k', value: 'v' }, ADMIN));
  const again = succeed(world.call('users.userClaim.add', { user_id: user.id, key: 'k', value: 'v' }, ADMIN));
  assert.deepEqual(again.claims, [{ key: 'k', value: 'v' }]);
  assert.equal(world.rows('user_claims').length, 1);
  succeed(world.call('users.userClaim.remove', { user_id: user.id, key: 'k', value: 'v' }, ADMIN));
  assert.equal(world.rows('user_claims').length, 0);
  for (let i = 0; i < 101; i++) {
    world.addRow('claims', { key: 'many', value: String(i) });
    if (i < 100) world.addRow('user_claims', { user_id: user.id, key: 'many', value: String(i) });
  }
  failDomain(world.call('users.userClaim.add', { user_id: user.id, key: 'many', value: '100' }, ADMIN), 'limit_exceeded');
});

test('deleting a user removes their assignments and own claims', () => {
  const world = createLegacyAdminWorld();
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, ADMIN));
  const bob = succeed(createUser(world, 'bob@example.com', { role_ids: [] }));
  const carl = succeed(createUser(world, 'carl@example.com'));
  [bob, carl].forEach((user) => {
    succeed(world.call('users.userRole.assign', { user_id: user.id, role_id: roleIdOf(world, 'viewer') }, ADMIN));
    succeed(world.call('users.userClaim.add', { user_id: user.id, key: 'k', value: 'v' }, ADMIN));
  });
  assert.deepEqual(succeed(world.call('users.user.delete', { id: bob.id }, ADMIN)), {});
  assert.deepEqual(world.rows('user_roles').map((row) => row.user_id), [carl.id]);
  assert.deepEqual(world.rows('user_claims').map((row) => row.user_id), [carl.id]);
  assert.equal(world.rows('users').some((row) => row.id === bob.id), false);
  failWith(world.call('users.user.delete', { id: bob.id }, ADMIN), 'NOT_FOUND');
});

test('the last active admin cannot be deactivated, deleted or lose the admin role', () => {
  const world = createLegacyAdminWorld();
  const self = succeed(world.call('users.user.get', { id: adminUserId(world) }, ADMIN));
  failDomain(world.call('users.user.update', {
    id: self.id, email: ADMIN, active: false, expected_last_modified: self.last_modified
  }, ADMIN), 'last_admin');
  failDomain(world.call('users.user.delete', { id: self.id }, ADMIN), 'last_admin');
  assert.equal(world.rows('users').find((row) => row.id === self.id).active, 'TRUE');
});

test('the last admin cannot unassign the explicit admin role', () => {
  const explicit = createWorldWithExplicitAdmin();
  const adminRoleId = uuid(701);
  failDomain(explicit.call('users.userRole.unassign', { user_id: uuid(903), role_id: adminRoleId }, ADMIN), 'last_admin');
  assert.equal(explicit.rows('user_roles').length, 1);
});

test('assigning a non-admin role to the legacy last admin is refused (it ends the fallback)', () => {
  const world = createLegacyAdminWorld();
  succeed(world.call('roles.role.create', { name: 'editor', description: '' }, ADMIN));
  failDomain(world.call('users.userRole.assign', { user_id: adminUserId(world), role_id: roleIdOf(world, 'viewer') }, ADMIN), 'last_admin');
});

test('inactive admins do not count towards the last-admin rule', () => {
  const world = createLegacyAdminWorld();
  const bob = addSecondAdmin(world);
  const loaded = succeed(world.call('users.user.get', { id: bob.id }, ADMIN));
  succeed(world.call('users.user.update', {
    id: bob.id, email: SECOND_ADMIN, active: false, expected_last_modified: loaded.last_modified
  }, ADMIN));
  failDomain(world.call('users.user.delete', { id: adminUserId(world) }, ADMIN), 'last_admin');
});

test('with another admin present, an admin still cannot lock themself out', () => {
  const world = createLegacyAdminWorld();
  addSecondAdmin(world);
  const self = succeed(world.call('users.user.get', { id: adminUserId(world) }, ADMIN));
  failDomain(world.call('users.user.update', {
    id: self.id, email: ADMIN, active: false, expected_last_modified: self.last_modified
  }, ADMIN), 'self_lockout');
  failDomain(world.call('users.user.update', {
    id: self.id, email: 'changed@example.com', active: true, expected_last_modified: self.last_modified
  }, ADMIN), 'self_lockout');
  failDomain(world.call('users.user.delete', { id: self.id }, ADMIN), 'self_lockout');
});

test('an admin cannot unassign their own admin role, but another admin can demote them', () => {
  const world = createLegacyAdminWorld();
  const bob = addSecondAdmin(world);
  const adminRoleId = roleIdOf(world, 'admin');
  failDomain(world.call('users.userRole.unassign', { user_id: bob.id, role_id: adminRoleId }, SECOND_ADMIN), 'self_lockout');
  const demoted = succeed(world.call('users.userRole.unassign', { user_id: bob.id, role_id: adminRoleId }, ADMIN));
  assert.deepEqual(demoted.role_ids, []);
});

test('access preview follows the effective-claims rules and works for inactive users', () => {
  const world = createLegacyAdminWorld();
  [['a', '1'], ['a', '3'], ['a', '9'], ['b', '2']].forEach(([key, value]) => {
    succeed(world.call('claims.claim.create', { key, value }, ADMIN));
  });
  const r1 = succeed(world.call('roles.role.create', { name: 'one', description: '' }, ADMIN));
  const r2 = succeed(world.call('roles.role.create', { name: 'two', description: '' }, ADMIN));
  [['a', '1'], ['b', '2']].forEach(([key, value]) => succeed(world.call('roles.roleClaim.add', { role_id: r1.id, key, value }, ADMIN)));
  succeed(world.call('roles.roleClaim.add', { role_id: r2.id, key: 'a', value: '3' }, ADMIN));
  const user = succeed(createUser(world, 'bob@example.com', { active: false, role_ids: [r1.id, r2.id] }));
  const preview = () => succeed(world.call('access-control.access.preview', { user_id: user.id }, ADMIN));
  assert.deepEqual(preview(), {
    email: 'bob@example.com', role: '', roles: ['one', 'two'],
    claims: [{ key: 'a', value: '1' }, { key: 'a', value: '3' }, { key: 'b', value: '2' }]
  });
  succeed(world.call('users.userClaim.add', { user_id: user.id, key: 'a', value: '9' }, ADMIN));
  assert.deepEqual(preview().claims, [{ key: 'a', value: '9' }, { key: 'b', value: '2' }]);
  succeed(world.call('users.userClaim.remove', { user_id: user.id, key: 'a', value: '9' }, ADMIN));
  succeed(world.call('users.userClaim.add', { user_id: user.id, key: 'b', value: '2' }, ADMIN));
  assert.deepEqual(preview().claims, [{ key: 'a', value: '1' }, { key: 'a', value: '3' }, { key: 'b', value: '2' }]);
  failWith(world.call('access-control.access.preview', { user_id: uuid(777) }, ADMIN), 'NOT_FOUND');
});

test('emails with control characters are refused', () => {
  const world = createLegacyAdminWorld();
  failDomain(createUser(world, 'bo\u0000b@example.com'), 'user_email_invalid');
  failDomain(createUser(world, 'bo\tb@example.com'), 'user_email_invalid');
  failDomain(createUser(world, 'bob@exam\u007fple.com'), 'user_email_invalid');
  succeed(createUser(world, '=bob@example.com'));
});

test('the users table holds at most 1000 rows', () => {
  const world = createLegacyAdminWorld();
  for (let i = world.rows('users').length; i < 1000; i++) world.addRow('users', { id: uuid(2000 + i), email: `u${i}@example.com`, role: '', active: 'TRUE' });
  failDomain(createUser(world, 'late@example.com'), 'limit_exceeded');
  assert.equal(world.rows('users').length, 1000);
});

test('assignment changes stamp the user row with the caller email', () => {
  const world = createLegacyAdminWorld();
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, ADMIN));
  const user = succeed(createUser(world, 'bob@example.com'));
  const stamp = () => world.rows('users').find((row) => row.id === user.id).last_modified;
  const steps = [
    ['users.userRole.assign', { user_id: user.id, role_id: roleIdOf(world, 'viewer') }],
    ['users.userClaim.add', { user_id: user.id, key: 'k', value: 'v' }],
    ['users.userClaim.remove', { user_id: user.id, key: 'k', value: 'v' }],
    ['users.userRole.unassign', { user_id: user.id, role_id: roleIdOf(world, 'viewer') }]
  ];
  steps.forEach(([action, payload]) => {
    const before = stamp();
    const result = succeed(world.call(action, payload, ADMIN));
    assert.notEqual(stamp(), before);
    assert.equal(result.last_modified, stamp());
    assert.equal(world.rows('users').find((row) => row.id === user.id).last_modified_by, ADMIN);
  });
});
