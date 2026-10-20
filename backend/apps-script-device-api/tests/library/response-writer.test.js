'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorld } = require('../harness/fakes');

function failureBody(error) {
  const { context } = createWorld();
  return JSON.parse(context.SharedKernelLibrary.ResponseWriter.failure(error).text);
}

test('failure keeps the code and message of an ApiError', () => {
  const { context } = createWorld();
  const apiError = new context.SharedKernelLibrary.ApiError('VALIDATION', 'name is required');
  const body = JSON.parse(context.SharedKernelLibrary.ResponseWriter.failure(apiError).text);
  assert.deepEqual(body, { ok: false, error: { code: 'VALIDATION', message: 'name is required' } });
});

test('failure hides the message of an unexpected error and logs only its name and message', () => {
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.join(' '));
  try {
    const body = failureBody(new TypeError('secret sheet id 123 in 1AbCdEfGhIjKlMnOpQrStUvWxYz'));
    assert.deepEqual(body, { ok: false, error: { code: 'INTERNAL', message: 'Internal error' } });
  } finally {
    console.error = original;
  }
  assert.equal(logged.length, 1);
  assert.match(logged[0], /TypeError/);
  assert.match(logged[0], /secret sheet id 123/);
  assert.doesNotMatch(logged[0], /1AbCdEfGhIjKlMnOpQrStUvWxYz/);
});

test('log text masks long id-like strings and is bounded', () => {
  const { context } = createWorld();
  const { LogSafeText } = context.SharedKernelLibrary;
  assert.equal(LogSafeText.of('Not found: 1AbCdEfGhIjKlMnOpQrStUvWxYz range A1'), 'Not found: [id] range A1');
  assert.equal(LogSafeText.of('ab '.repeat(200)).length, 200);
});
