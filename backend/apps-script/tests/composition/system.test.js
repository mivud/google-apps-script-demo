'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createWorld } = require('../harness/fakes');

const SYSTEM_VERSION_ACTION = 'system.version.get';

function createRouter(world) {
  const { Composition, SystemEndpoints, Router } = world.context;
  return new Router(Composition.createEndpointRegistry(world.deps), SystemEndpoints.readActions());
}

test('API_VERSION equals the version in package.json', () => {
  const { version } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
  assert.equal(createWorld().context.SystemEndpoints.API_VERSION, version);
});

test('system.version.get returns the version and runs without the write lock', () => {
  const world = createWorld();
  const router = createRouter(world);
  const result = router.resolve(SYSTEM_VERSION_ACTION)({});
  assert.equal(result.version, world.context.SystemEndpoints.API_VERSION);
  assert.equal(router.isReadOnly(SYSTEM_VERSION_ACTION), true);
});
