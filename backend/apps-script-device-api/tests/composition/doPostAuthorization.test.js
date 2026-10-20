'use strict';
// doPost authorization of the device-management API: the access comes from a fake identity client,
// everything after it (AccessControl, real Router, real endpoints) is production code.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld } = require('../harness/fakes');

const READ_ACTIONS = [
  'device-management.category.list',
  'device-management.equipment.list',
  'device-management.maintenance.listByEquipment'
];
const WRITE_ACTIONS = [
  'device-management.category.create',
  'device-management.equipment.create',
  'device-management.equipment.remove',
  'device-management.maintenance.add'
];

const permission = (value) => ({ key: 'permission', value });
const holder = (...claims) => ({ email: 'a@b.c', role: '', roles: [], claims });

function createCaller(access) {
  const world = createWorld();
  const { context } = world;
  const registry = context.Composition.createEndpointRegistry(world.deps);
  const readActions = [].concat(context.DeviceManagement.readActions(), context.SystemEndpoints.readActions());
  context.Composition.createApp = () => ({
    accessResolver: { resolve: () => access },
    currentUser: { signIn: () => {} },
    lockGuard: { runExclusive: (work) => work() },
    router: new context.Router(registry, readActions),
    schemaInstaller: { isCurrent: () => true }
  });
  return (action, payload = {}) => {
    const output = context.doPost({ postData: { contents: JSON.stringify({ idToken: 't', action, payload }) } });
    return JSON.parse(output.text);
  };
}

// Authorization runs before validation, so any answer except FORBIDDEN means the action was let through.
const isForbidden = (response) => !response.ok && response.error.code === 'FORBIDDEN';
const assertForbidden = (response, label) => assert.equal(isForbidden(response), true, `${label}: ${JSON.stringify(response)}`);
const assertAllowed = (response, label) => assert.equal(isForbidden(response), false, `${label}: ${JSON.stringify(response)}`);

test('read permission runs read actions and is forbidden on writes', () => {
  const call = createCaller(holder(permission('device.mgt.read')));
  READ_ACTIONS.forEach((action) => assertAllowed(call(action), action));
  WRITE_ACTIONS.forEach((action) => assertForbidden(call(action), action));
});

test('write permission runs writes but cannot read', () => {
  const call = createCaller(holder(permission('device.mgt.write')));
  WRITE_ACTIONS.forEach((action) => assertAllowed(call(action), action));
  READ_ACTIONS.forEach((action) => assertForbidden(call(action), action));
});

test('super (primary or in roles) passes reads and writes', () => {
  [{ ...holder(), role: 'super' }, { ...holder(), roles: ['reader', 'super'] }].forEach((access) => {
    const call = createCaller(access);
    [...READ_ACTIONS, ...WRITE_ACTIONS].forEach((action) => assertAllowed(call(action), action));
  });
});

test('an unknown action is refused for a caller without permissions', () => {
  assertForbidden(createCaller(holder())('device-management.unknown.action'), 'unknown');
});

test('malformed access or claims fail closed', () => {
  const malformed = [
    null,
    undefined,
    { email: 'a@b.c' },
    holder(permission('Device.Mgt.Read')),
    holder({ key: 'Permission', value: 'device.mgt.read' }),
    holder({ key: 'permission', value: ['device.mgt.read'] }),
    { ...holder(), claims: 'device.mgt.read' },
    { ...holder(), claims: [null, 7, 'device.mgt.read'] },
    { ...holder(), role: 'Super', roles: ['SUPER'] }
  ];
  malformed.forEach((access, index) => {
    const call = createCaller(access);
    [READ_ACTIONS[0], WRITE_ACTIONS[0]].forEach((action) => {
      const response = call(action);
      assert.equal(response.ok, false, `case ${index} ${action}: ${JSON.stringify(response)}`);
    });
  });
});
