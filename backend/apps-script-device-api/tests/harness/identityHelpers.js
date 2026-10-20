'use strict';
// Shorthands for the identity-api tests, on top of identityWorld.
const assert = require('node:assert/strict');
const { createWorld, uuid } = require('./identityWorld');

const SUPER = 'ann@example.com';
const SECOND_SUPER = 'bob@example.com';
const SUPER_ROW_ID = uuid(901);
const SUPER_ROLE_ID = uuid(900);

// A world whose only user holds the `super` role (rows written by hand, like the owner's manual setup).
function createSuperWorld() {
  const world = createWorld();
  world.addRow('roles', { id: SUPER_ROLE_ID, name: 'super', description: 'Full access to everything' });
  world.addRow('users', { id: SUPER_ROW_ID, email: SUPER, role: '', active: 'TRUE' });
  world.addRow('user_roles', { user_id: SUPER_ROW_ID, role_id: SUPER_ROLE_ID });
  return world;
}

// Adds an active user holding one permission claim directly (hand-written rows).
function addPermissionUser(world, email, value, rowNumber) {
  world.addRow('users', { id: uuid(rowNumber), email, role: '', active: 'TRUE' });
  world.addRow('user_claims', { user_id: uuid(rowNumber), key: 'permission', value });
}

function succeed(response) {
  assert.equal(response.ok, true, JSON.stringify(response));
  return response.data;
}

function failWith(response, code, message) {
  assert.equal(response.ok, false, `expected failure ${code}/${message}, got ${JSON.stringify(response)}`);
  assert.equal(response.error.code, code);
  if (message !== undefined) assert.equal(response.error.message, message);
}

// Domain failures travel as VALIDATION with the stable code in the message.
function failDomain(response, domainCode) {
  failWith(response, 'VALIDATION', domainCode);
}

const roleIdOf = (world, name) => world.rows('roles').find((row) => row.name === name).id;

// Adds a second active super through the API (the first super assigns the super role).
function addSecondSuper(world) {
  const created = succeed(world.call('users.user.create', { email: SECOND_SUPER, active: true }, SUPER));
  succeed(world.call('users.userRole.assign', { user_id: created.id, role_id: SUPER_ROLE_ID }, SUPER));
  return created;
}

module.exports = {
  SUPER, SECOND_SUPER, SUPER_ROW_ID, SUPER_ROLE_ID, createSuperWorld, addPermissionUser,
  succeed, failWith, failDomain, roleIdOf, addSecondSuper, uuid
};
