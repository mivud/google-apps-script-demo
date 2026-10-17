'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createWorld } = require('../harness/identityWorld');
const {
  ADMIN, createLegacyAdminWorld, succeed, failWith, uuid
} = require('../harness/identityHelpers');

const ADMIN_ACTIONS = [
  ['claims.claim.list', {}], ['claims.claim.create', { key: 'k', value: 'v' }], ['claims.claim.delete', { key: 'k', value: 'v' }],
  ['roles.role.list', {}], ['roles.role.get', { id: uuid(1) }], ['roles.role.create', { name: 'editor', description: '' }],
  ['roles.role.update', { id: uuid(1), name: 'x1', description: '', expected_last_modified: '' }], ['roles.role.delete', { id: uuid(1) }],
  ['roles.roleClaim.add', { role_id: uuid(1), key: 'k', value: 'v' }], ['roles.roleClaim.remove', { role_id: uuid(1), key: 'k', value: 'v' }],
  ['users.user.list', {}], ['users.user.get', { id: uuid(1) }], ['users.user.create', { email: 'n@example.com', active: true }],
  ['users.user.update', { id: uuid(1), email: 'n@example.com', active: true, expected_last_modified: '' }],
  ['users.user.delete', { id: uuid(1) }], ['users.userRole.assign', { user_id: uuid(1), role_id: uuid(2) }],
  ['users.userRole.unassign', { user_id: uuid(1), role_id: uuid(2) }], ['users.userClaim.add', { user_id: uuid(1), key: 'k', value: 'v' }],
  ['users.userClaim.remove', { user_id: uuid(1), key: 'k', value: 'v' }], ['access-control.access.preview', { user_id: uuid(1) }]
];

test('every admin action refuses viewers, unknown users and invalid tokens', () => {
  const world = createLegacyAdminWorld();
  world.addRow('users', { id: uuid(902), email: 'view@example.com', role: 'viewer', active: 'TRUE' });
  world.addRow('users', { id: uuid(903), email: 'off@example.com', role: 'admin', active: 'FALSE' });
  ADMIN_ACTIONS.forEach(([action, payload]) => {
    failWith(world.call(action, payload, 'view@example.com'), 'FORBIDDEN');
    failWith(world.call(action, payload, 'off@example.com'), 'FORBIDDEN');
    failWith(world.call(action, payload, 'nobody@example.com'), 'FORBIDDEN');
    failWith(world.call(action, payload, 'garbage'), 'UNAUTHORIZED');
  });
  assert.equal(world.rows('claims').length, 0);
  assert.equal(world.rows('users').length, 3);
  // Only the idempotent built-in role seed may have been written.
  assert.deepEqual(world.rows('roles').map((row) => row.name).sort(), ['admin', 'viewer']);
});

test('authorization comes from the token and stored data, never from the payload', () => {
  const world = createLegacyAdminWorld();
  world.addRow('users', { id: uuid(902), email: 'view@example.com', role: 'viewer', active: 'TRUE' });
  failWith(world.call('claims.claim.create', {
    key: 'k', value: 'v', email: ADMIN, role: 'admin', idToken: world.tokenFor(ADMIN), actor: ADMIN
  }, 'view@example.com'), 'FORBIDDEN');
  assert.equal(world.rows('claims').length, 0);
});

test('unknown actions are rejected as VALIDATION', () => {
  const world = createLegacyAdminWorld();
  failWith(world.call('users.user.purge', {}, ADMIN), 'VALIDATION');
});

test('writes run under the write lock, reads do not', () => {
  const world = createLegacyAdminWorld();
  let before = world.lock.runs;
  succeed(world.call('users.user.list', {}, ADMIN));
  succeed(world.call('roles.role.list', {}, ADMIN));
  succeed(world.call('claims.claim.list', {}, ADMIN));
  assert.equal(world.lock.runs, before);
  before = world.lock.runs;
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, ADMIN));
  assert.equal(world.lock.runs, before + 1);
  failWith(world.call('claims.claim.delete', { key: 'zz', value: 'v' }, ADMIN), 'NOT_FOUND');
  assert.equal(world.lock.runs, before + 2);
});

test('the write handler really executes while the lock is held', () => {
  const world = createLegacyAdminWorld();
  let heldDuringWrite = null;
  const original = world.core.source.readValues;
  world.core.source.readValues = (schema) => {
    if (schema.sheetName === 'claims') heldDuringWrite = world.lock.held;
    return original(schema);
  };
  world.core.rowCache.remove('claims');
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, ADMIN));
  assert.equal(heldDuringWrite, true);
});

test('writes invalidate the row cache of every sheet they change, so reads see them at once', () => {
  const world = createLegacyAdminWorld();
  succeed(world.call('users.user.list', {}, ADMIN));
  assert.ok(world.cacheStore.has('rows:users'));
  world.cacheRemovals.length = 0;
  const created = succeed(world.call('users.user.create', { email: 'bob@example.com', active: true }, ADMIN));
  assert.ok(world.cacheRemovals.includes('users'));
  assert.equal(succeed(world.call('users.user.list', {}, ADMIN)).items.length, 2);
  succeed(world.call('users.userRole.assign', { user_id: created.id, role_id: world.rows('roles')[1].id }, ADMIN));
  assert.ok(world.cacheRemovals.includes('user_roles'));
  succeed(world.call('claims.claim.create', { key: 'k', value: 'v' }, ADMIN));
  assert.ok(world.cacheRemovals.includes('claims'));
  succeed(world.call('users.userClaim.add', { user_id: created.id, key: 'k', value: 'v' }, ADMIN));
  assert.ok(world.cacheRemovals.includes('user_claims'));
  succeed(world.call('roles.roleClaim.add', { role_id: world.rows('roles')[0].id, key: 'k', value: 'v' }, ADMIN));
  assert.ok(world.cacheRemovals.includes('role_claims'));
  succeed(world.call('users.user.delete', { id: created.id }, ADMIN));
  assert.equal(succeed(world.call('users.user.list', {}, ADMIN)).items.length, 1);
});

// Cell values starting with = + - @ must stay text: the table switches the row to plain text before writing.
test('formula-looking values are written as text', () => {
  const world = createLegacyAdminWorld();
  const payloads = [
    ['claims', 'claims.claim.create', { key: 'k', value: '=HYPERLINK("http://evil.example","x")' }],
    ['roles', 'roles.role.create', { name: 'editor', description: '+SUM(1)' }],
    ['users', 'users.user.create', { email: '=cmd@example.com', active: true }],
    ['claims', 'claims.claim.create', { key: 'k', value: '@SUM(1)' }],
    ['claims', 'claims.claim.create', { key: 'k', value: '-1+1' }]
  ];
  payloads.forEach(([sheetName, action, payload]) => {
    succeed(world.call(action, payload, ADMIN));
    const log = world.sheet(sheetName).log;
    const write = log[log.length - 1];
    const format = log[log.length - 2];
    assert.equal(write.op, 'setValues');
    assert.deepEqual([format.op, format.format, format.row], ['format', '@', write.row]);
    assert.ok(format.columnCount >= write.columnCount);
  });
  assert.equal(world.rows('claims')[0].value, '=HYPERLINK("http://evil.example","x")');
  assert.equal(world.rows('users').some((row) => row.email === '=cmd@example.com'), true);
});

test('audit: created_by never changes, last_modified_by follows the verified caller', () => {
  const world = createLegacyAdminWorld();
  const role = succeed(world.call('roles.role.create', { name: 'editor', description: '' }, ADMIN));
  const row = world.rows('roles').find((candidate) => candidate.id === role.id);
  assert.deepEqual([row.created, row.created_by, row.last_modified, row.last_modified_by],
    [role.created, ADMIN, role.created, ADMIN]);
  const seeded = world.rows('roles').find((candidate) => candidate.name === 'admin');
  assert.equal(seeded.created_by, 'system');
});

test('upgrading the live users sheet keeps id/email/role/active and drops the old date columns', () => {
  const world = createWorld({
    beforeInstall(target) {
      const sheet = target.spreadsheet.insertSheet('users');
      sheet.grid = [
        ['id', 'email', 'role', 'active', 'created_at', 'updated_at'],
        [uuid(901), ADMIN, 'admin', 'TRUE', '2025-01-01T00:00:00.000+00:00', '2025-02-01T00:00:00.000+00:00']
      ];
    }
  });
  assert.deepEqual(world.sheet('users').grid[0],
    ['id', 'email', 'role', 'active', 'created', 'created_by', 'last_modified', 'last_modified_by']);
  assert.deepEqual(world.rows('users')[0], {
    id: uuid(901), email: ADMIN, role: 'admin', active: 'TRUE', created: '', created_by: '', last_modified: '', last_modified_by: ''
  });
  ['claims', 'roles', 'users', 'user_roles', 'role_claims', 'user_claims'].forEach((name) => assert.ok(world.sheet(name), name));
  assert.equal(succeed(world.call('auth.access.resolve', {}, ADMIN)).role, 'admin');
  // A legacy row has an empty last_modified, so the client echoes the empty value to update it.
  const legacy = succeed(world.call('users.user.get', { id: uuid(901) }, ADMIN));
  assert.equal(legacy.last_modified, '');
});

test('schema signature covers all six sheets', () => {
  const world = createWorld();
  const signature = world.core.settings.read('SCHEMA_SIGNATURE');
  ['claims:key,value,', 'roles:id,name,description,', 'role_claims:role_id,key,value,', 'users:id,email,role,active,',
    'user_roles:user_id,role_id,', 'user_claims:user_id,key,value,'].forEach((part) => assert.ok(signature.includes(part), part));
});

test('the API version equals the one in package.json', () => {
  const world = createWorld();
  const { version } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'apps-script-identity-api', 'package.json'), 'utf8'));
  assert.equal(world.context.SystemEndpoints.API_VERSION, version);
  const response = world.call('system.version.get', {}, ADMIN);
  assert.equal(succeed(response).version, version);
});

test('domain errors never leak internals: unexpected failures are generic INTERNAL', () => {
  const world = createLegacyAdminWorld();
  const original = world.core.source.readValues;
  world.core.source.readValues = () => { throw new Error('secret sheet detail'); };
  const quiet = console.error;
  console.error = () => {};
  const response = world.call('claims.claim.list', {}, ADMIN);
  console.error = quiet;
  world.core.source.readValues = original;
  failWith(response, 'INTERNAL', 'Internal error');
});
