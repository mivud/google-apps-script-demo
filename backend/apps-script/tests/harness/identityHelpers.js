'use strict';
// Shorthands for the identity-api tests, on top of identityWorld.
const assert = require('node:assert/strict');
const { createWorld, uuid } = require('./identityWorld');

const ADMIN = 'ann@example.com';
const SECOND_ADMIN = 'bob@example.com';
const ADMIN_ROW_ID = uuid(901);

// A world whose only user is a legacy admin (users.role = admin, no user_roles rows), like the live sheet today.
function createLegacyAdminWorld() {
  const world = createWorld();
  world.addRow('users', { id: ADMIN_ROW_ID, email: ADMIN, role: 'admin', active: 'TRUE' });
  return world;
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

// Adds a second active admin through the API (the legacy admin assigns the admin role).
function addSecondAdmin(world) {
  world.call('claims.claim.list', {}, ADMIN);
  const created = succeed(world.call('users.user.create', { email: SECOND_ADMIN, active: true }, ADMIN));
  succeed(world.call('users.userRole.assign', { user_id: created.id, role_id: roleIdOf(world, 'admin') }, ADMIN));
  return created;
}

module.exports = { ADMIN, SECOND_ADMIN, ADMIN_ROW_ID, createLegacyAdminWorld, succeed, failWith, failDomain, roleIdOf, addSecondAdmin, uuid };
