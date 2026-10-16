'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createWorld } = require('../harness/fakes');

const LIBRARY_PACKAGE = path.join(__dirname, '..', '..', '..', 'apps-script-shared-kernel-library', 'package.json');
const BETA_VERSION_FORMAT = /^1\.0\.\d+-beta\.\d+$/;

test('KERNEL_VERSION equals the library package.json version and uses the 1.0.x-beta.N format', () => {
  const { version } = JSON.parse(fs.readFileSync(LIBRARY_PACKAGE, 'utf8'));
  assert.equal(createWorld().context.SharedKernelLibrary.KERNEL_VERSION, version);
  assert.match(version, BETA_VERSION_FORMAT);
});
