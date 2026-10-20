'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  SUPER, SECOND_SUPER, SUPER_ROLE_ID, SUPER_ROW_ID, createSuperWorld, succeed, failWith, failDomain, roleIdOf, addSecondSuper, uuid
} = require('../harness/identityHelpers');

// A plain role without any special meaning, created on first use.
const readerRoleId = (world) => {
  const existing = world.rows('roles').find((row) => row.name === 'reader');
  return existing ? existing.id : succeed(world.call('roles.role.create', { name: 'reader', description: '' }, SUPER)).id;
};
const createUser = (world, email, extra = {}, as = SUPER) =>
  world.call('users.user.create', { email, active: true, ...extra }, as);
const superUserId = (world) => world.rows('users').find((row) => row.email === SUPER).id;

test('user creation normalizes the email, assigns roles and audits with the token email', () => {
  const world = createSuperWorld();
  succeed(world.call('roles.role.create', { name: 'editor', description: '' }, SUPER));
  const readerId = readerRoleId(world);
  const user = succeed(createUser(world, ' Bob@Example.COM ', {
    role_ids: [readerId, readerId], created_by: 'evil', last_modified_by: 'evil'
  }));
  assert.equal(user.email, 'bob@example.com');
  assert.equal(user.active, true);
  assert.deepEqual(user.role_ids, [readerId]);
  assert.deepEqual(user.claims, []);
  assert.equal(user.created_by, SUPER);
  assert.equal(user.last_modified_by, SUPER);
  const row = world.rows('users').find((candidate) => candidate.id === user.id);
  assert.equal(row.role, '');
  assert.equal(row.active, 'TRUE');
  const assignment = world.rows('user_roles').find((candidate) => candidate.user_id === user.id);
  assert.deepEqual({ user_id: assignment.user_id, role_id: assignment.role_id, created_by: assignment.created_by },
    { user_id: user.id, role_id: readerId, created_by: SUPER });
  assert.deepEqual(succeed(world.call('users.user.get', { id: user.id }, SUPER)), user);
});

test('user input rules: email shape, duplicates, unknown roles, role limit, types', () => {
  const world = createSuperWorld();
  failDomain(createUser(world, 'not-an-email'), 'user_email_invalid');
  succeed(createUser(world, 'bob@example.com'));
  failDomain(createUser(world, 'BOB@example.com'), 'user_email_duplicate');
  failWith(createUser(world, 'carl@example.com', { role_ids: [uuid(777)] }), 'NOT_FOUND');
  const tooMany = Array.from({ length: 21 }, (_v, i) => uuid(800 + i));
  failDomain(createUser(world, 'many@example.com', { role_ids: tooMany }), 'limit_exceeded');
  failDomain(world.call('users.user.create', { email: 'x@example.com', active: 'yes' }, SUPER), 'invalid_request');
  failDomain(createUser(world, 'x@example.com', { role_ids: 'r' }), 'invalid_request');
  assert.equal(world.rows('users').length, 2);
});

test('user list returns every user with role ids and own claims', () => {
  const world = createSuperWorld();
  succeed(createUser(world, 'bob@example.com'));
  const items = succeed(world.call('users.user.list', {}, SUPER)).items;
  assert.deepEqual(items.map((item) => item.email), [SUPER, 'bob@example.com']);
  assert.deepEqual(items[0].role_ids, [SUPER_ROLE_ID]);
});

test('update uses optimistic concurrency, rejects duplicate emails and stamps the modifier', () => {
  const world = createSuperWorld();
  const bob = succeed(createUser(world, 'bob@example.com'));
  const carl = succeed(createUser(world, 'carl@example.com'));
  failDomain(world.call('users.user.update', {
    id: bob.id, email: 'carl@example.com', active: true, expected_last_modified: bob.last_modified
  }, SUPER), 'user_email_duplicate');
  const updated = succeed(world.call('users.user.update', {
    id: bob.id, email: 'robert@example.com', active: false, expected_last_modified: bob.last_modified
  }, SUPER));
  assert.equal(updated.email, 'robert@example.com');
  assert.equal(updated.active, false);
  assert.equal(world.rows('users').find((row) => row.id === bob.id).active, 'FALSE');
  failDomain(world.call('users.user.update', {
    id: bob.id, email: 'robert@example.com', active: true, expected_last_modified: bob.last_modified
  }, SUPER), 'conflict');
  assert.ok(carl.id);
});

test('the legacy role column is ignored for access but kept as written on update', () => {
  const world = createSuperWorld();
  addSecondSuper(world);
  world.addRow('users', { id: uuid(903), email: 'old@example.com', role: 'viewer', active: 'TRUE' });
  const old = succeed(world.call('users.user.get', { id: uuid(903) }, SUPER));
  succeed(world.call('users.user.update', {
    id: old.id, email: 'old@example.com', active: true, expected_last_modified: old.last_modified
  }, SUPER));
  assert.equal(world.rows('users').find((row) => row.id === old.id).role, 'viewer');
  assert.equal(succeed(world.call('auth.access.resolve', {}, 'old@example.com')).role, '');
});

test('role assignment is idempotent, audited and limited to 20 roles', () => {
  const world = createSuperWorld();
  const user = succeed(createUser(world, 'bob@example.com'));
  const readerId = readerRoleId(world);
  const first = succeed(world.call('users.userRole.assign', { user_id: user.id, role_id: readerId }, SUPER));
  succeed(world.call('users.userRole.assign', { user_id: user.id, role_id: readerId }, SUPER));
  assert.deepEqual(first.role_ids, [readerId]);
  const ownRows = world.rows('user_roles').filter((row) => row.user_id === user.id);
  assert.equal(ownRows.length, 1);
  assert.equal(ownRows[0].created_by, SUPER);
  failWith(world.call('users.userRole.assign', { user_id: user.id, role_id: uuid(777) }, SUPER), 'NOT_FOUND');
  for (let i = 0; i < 19; i++) world.addRow('user_roles', { user_id: user.id, role_id: uuid(600 + i) });
  const extra = succeed(world.call('roles.role.create', { name: 'extra', description: '' }, SUPER));
  failDomain(world.call('users.userRole.assign', { user_id: user.id, role_id: extra.id }, SUPER), 'limit_exceeded');
  const removed = succeed(world.call('users.userRole.unassign', { user_id: user.id, role_id: readerId }, SUPER));
  assert.equal(removed.role_ids.includes(readerId), false);
  succeed(world.call('users.userRole.unassign', { user_id: user.id, role_id: readerId }, SUPER));
});

test('own claims need a catalog claim, are idempotent and limited to 100', () => {
  const world = createSuperWorld();
  const user = succeed(createUser(world, 'bob@example.com'));
  failDomain(world.call('users.userClaim.add', { user_id: user.id, key: 'k', value: 'v' }, SUPER), 'claim_unknown');
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, SUPER));
  succeed(world.call('users.userClaim.add', { user_id: user.id, key: 'k', value: 'v' }, SUPER));
  const again = succeed(world.call('users.userClaim.add', { user_id: user.id, key: 'k', value: 'v' }, SUPER));
  assert.deepEqual(again.claims, [{ key: 'k', value: 'v' }]);
  assert.equal(world.rows('user_claims').length, 1);
  succeed(world.call('users.userClaim.remove', { user_id: user.id, key: 'k', value: 'v' }, SUPER));
  assert.equal(world.rows('user_claims').length, 0);
  for (let i = 0; i < 101; i++) {
    world.addRow('claims', { key: 'many', value: String(i) });
    if (i < 100) world.addRow('user_claims', { user_id: user.id, key: 'many', value: String(i) });
  }
  failDomain(world.call('users.userClaim.add', { user_id: user.id, key: 'many', value: '100' }, SUPER), 'limit_exceeded');
});

test('deleting a user removes their assignments and own claims', () => {
  const world = createSuperWorld();
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, SUPER));
  const bob = succeed(createUser(world, 'bob@example.com', { role_ids: [] }));
  const carl = succeed(createUser(world, 'carl@example.com'));
  [bob, carl].forEach((user) => {
    succeed(world.call('users.userRole.assign', { user_id: user.id, role_id: readerRoleId(world) }, SUPER));
    succeed(world.call('users.userClaim.add', { user_id: user.id, key: 'k', value: 'v' }, SUPER));
  });
  assert.deepEqual(succeed(world.call('users.user.delete', { id: bob.id }, SUPER)), {});
  assert.deepEqual(world.rows('user_roles').map((row) => row.user_id), [SUPER_ROW_ID, carl.id]);
  assert.deepEqual(world.rows('user_claims').map((row) => row.user_id), [carl.id]);
  assert.equal(world.rows('users').some((row) => row.id === bob.id), false);
  failWith(world.call('users.user.delete', { id: bob.id }, SUPER), 'NOT_FOUND');
});

test('the last active super cannot be deactivated, deleted or lose the super role', () => {
  const world = createSuperWorld();
  const self = succeed(world.call('users.user.get', { id: superUserId(world) }, SUPER));
  failDomain(world.call('users.user.update', {
    id: self.id, email: SUPER, active: false, expected_last_modified: self.last_modified
  }, SUPER), 'last_super');
  failDomain(world.call('users.user.delete', { id: self.id }, SUPER), 'last_super');
  assert.equal(world.rows('users').find((row) => row.id === self.id).active, 'TRUE');
});

test('the last super cannot unassign the super role', () => {
  const world = createSuperWorld();
  failDomain(world.call('users.userRole.unassign', { user_id: SUPER_ROW_ID, role_id: SUPER_ROLE_ID }, SUPER), 'last_super');
  assert.equal(world.rows('user_roles').length, 1);
});

test('assigning another role to the last super keeps the super role', () => {
  const world = createSuperWorld();
  const assigned = succeed(world.call('users.userRole.assign', { user_id: SUPER_ROW_ID, role_id: readerRoleId(world) }, SUPER));
  assert.equal(assigned.role_ids.includes(SUPER_ROLE_ID), true);
});

test('inactive supers do not count towards the last-super rule', () => {
  const world = createSuperWorld();
  const bob = addSecondSuper(world);
  const loaded = succeed(world.call('users.user.get', { id: bob.id }, SUPER));
  succeed(world.call('users.user.update', {
    id: bob.id, email: SECOND_SUPER, active: false, expected_last_modified: loaded.last_modified
  }, SUPER));
  failDomain(world.call('users.user.delete', { id: superUserId(world) }, SUPER), 'last_super');
});

test('with another super present, a super still cannot lock themself out', () => {
  const world = createSuperWorld();
  addSecondSuper(world);
  const self = succeed(world.call('users.user.get', { id: superUserId(world) }, SUPER));
  failDomain(world.call('users.user.update', {
    id: self.id, email: SUPER, active: false, expected_last_modified: self.last_modified
  }, SUPER), 'self_lockout');
  failDomain(world.call('users.user.update', {
    id: self.id, email: 'changed@example.com', active: true, expected_last_modified: self.last_modified
  }, SUPER), 'self_lockout');
  failDomain(world.call('users.user.delete', { id: self.id }, SUPER), 'self_lockout');
});

test('a super cannot unassign their own super role, but another super can demote them', () => {
  const world = createSuperWorld();
  const bob = addSecondSuper(world);
  const superRoleId = SUPER_ROLE_ID;
  failDomain(world.call('users.userRole.unassign', { user_id: bob.id, role_id: superRoleId }, SECOND_SUPER), 'self_lockout');
  const demoted = succeed(world.call('users.userRole.unassign', { user_id: bob.id, role_id: superRoleId }, SUPER));
  assert.deepEqual(demoted.role_ids, []);
});

test('access preview is additive, deduplicates and works for inactive users', () => {
  const world = createSuperWorld();
  [['a', '1'], ['a', '3'], ['a', '9'], ['b', '2']].forEach(([key, value]) => {
    succeed(world.call('claims.claim.create', { key, value }, SUPER));
  });
  const r1 = succeed(world.call('roles.role.create', { name: 'one', description: '' }, SUPER));
  const r2 = succeed(world.call('roles.role.create', { name: 'two', description: '' }, SUPER));
  [['a', '1'], ['b', '2']].forEach(([key, value]) => succeed(world.call('roles.roleClaim.add', { role_id: r1.id, key, value }, SUPER)));
  succeed(world.call('roles.roleClaim.add', { role_id: r2.id, key: 'a', value: '3' }, SUPER));
  const user = succeed(createUser(world, 'bob@example.com', { active: false, role_ids: [r1.id, r2.id] }));
  const preview = () => succeed(world.call('access-control.access.preview', { user_id: user.id }, SUPER));
  assert.deepEqual(preview(), {
    email: 'bob@example.com', role: 'one', roles: ['one', 'two'],
    claims: [{ key: 'a', value: '1' }, { key: 'a', value: '3' }, { key: 'b', value: '2' }]
  });
  succeed(world.call('users.userClaim.add', { user_id: user.id, key: 'a', value: '9' }, SUPER));
  assert.deepEqual(preview().claims, [{ key: 'a', value: '1' }, { key: 'a', value: '3' }, { key: 'a', value: '9' }, { key: 'b', value: '2' }]);
  succeed(world.call('users.userClaim.remove', { user_id: user.id, key: 'a', value: '9' }, SUPER));
  succeed(world.call('users.userClaim.add', { user_id: user.id, key: 'b', value: '2' }, SUPER));
  assert.deepEqual(preview().claims, [{ key: 'a', value: '1' }, { key: 'a', value: '3' }, { key: 'b', value: '2' }]);
  failWith(world.call('access-control.access.preview', { user_id: uuid(777) }, SUPER), 'NOT_FOUND');
});

test('emails with control characters are refused', () => {
  const world = createSuperWorld();
  failDomain(createUser(world, 'bo\u0000b@example.com'), 'user_email_invalid');
  failDomain(createUser(world, 'bo\tb@example.com'), 'user_email_invalid');
  failDomain(createUser(world, 'bob@exam\u007fple.com'), 'user_email_invalid');
  succeed(createUser(world, '=bob@example.com'));
});

test('the users table holds at most 1000 rows', () => {
  const world = createSuperWorld();
  for (let i = world.rows('users').length; i < 1000; i++) world.addRow('users', { id: uuid(2000 + i), email: `u${i}@example.com`, role: '', active: 'TRUE' });
  failDomain(createUser(world, 'late@example.com'), 'limit_exceeded');
  assert.equal(world.rows('users').length, 1000);
});

test('assignment changes stamp the user row with the caller email', () => {
  const world = createSuperWorld();
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, SUPER));
  const user = succeed(createUser(world, 'bob@example.com'));
  const stamp = () => world.rows('users').find((row) => row.id === user.id).last_modified;
  const steps = [
    ['users.userRole.assign', { user_id: user.id, role_id: readerRoleId(world) }],
    ['users.userClaim.add', { user_id: user.id, key: 'k', value: 'v' }],
    ['users.userClaim.remove', { user_id: user.id, key: 'k', value: 'v' }],
    ['users.userRole.unassign', { user_id: user.id, role_id: readerRoleId(world) }]
  ];
  steps.forEach(([action, payload]) => {
    const before = stamp();
    const result = succeed(world.call(action, payload, SUPER));
    assert.notEqual(stamp(), before);
    assert.equal(result.last_modified, stamp());
    assert.equal(world.rows('users').find((row) => row.id === user.id).last_modified_by, SUPER);
  });
});
