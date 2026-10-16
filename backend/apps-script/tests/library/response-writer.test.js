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
    const body = failureBody(new TypeError('secret sheet id 123'));
    assert.deepEqual(body, { ok: false, error: { code: 'INTERNAL', message: 'Internal error' } });
  } finally {
    console.error = original;
  }
  assert.equal(logged.length, 1);
  assert.match(logged[0], /TypeError/);
  assert.match(logged[0], /secret sheet id 123/);
});
