'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadIdentityApi } = require('../harness/loadAppsScript');

const { Auth } = loadIdentityApi();
const { Email, Role, SessionNonce, User, AuthError } = Auth.Domain;
const VALID_NONCE = 'abcdefghijklmnop';

function codeOf(work) {
  try { work(); } catch (error) { return error.code; }
  return null;
}

test('Email.normalize trims and lowercases, never throws', () => {
  assert.equal(Email.normalize('  Ann@Example.COM '), 'ann@example.com');
  assert.equal(Email.normalize(null), '');
  assert.equal(Email.normalize(undefined), '');
});

test('Email.of accepts an email and rejects bad shapes, blanks and over-long values', () => {
  assert.equal(Email.of(' Ann@Example.com'), 'ann@example.com');
  ['', 'plain', 'a b@c.d', '@c.d', 'a@', null].forEach((bad) => {
    assert.equal(codeOf(() => Email.of(bad)), AuthError.INVALID_EMAIL, String(bad));
  });
  const tooLong = `${'a'.repeat(Email.MAX_LENGTH)}@x.io`;
  assert.equal(codeOf(() => Email.of(tooLong)), AuthError.INVALID_EMAIL);
});

test('Role.parse keeps only admin and viewer, case-insensitively; others become empty', () => {
  assert.equal(Role.parse(' ADMIN '), 'admin');
  assert.equal(Role.parse('Viewer'), 'viewer');
  ['', 'root', 'administrator', undefined, null].forEach((bad) => assert.equal(Role.parse(bad), ''));
  assert.equal(Role.isValid('admin'), true);
  assert.equal(Role.isValid('Admin'), false);
});

test('SessionNonce.parse enforces length and alphabet', () => {
  assert.equal(SessionNonce.parse(VALID_NONCE), VALID_NONCE);
  assert.equal(SessionNonce.parse('a'.repeat(128)).length, 128);
  ['short', 'a'.repeat(129), 'has space 123456789', 'bad+chars/1234567', 42, null].forEach((bad) => {
    assert.equal(codeOf(() => SessionNonce.parse(bad)), AuthError.INVALID_NONCE, String(bad));
  });
});

test('SessionNonce claim must be a non-empty string equal to the hash', () => {
  assert.equal(SessionNonce.matchesClaim('h1', 'h1'), true);
  assert.equal(SessionNonce.matchesClaim('h1', 'h2'), false);
  assert.equal(SessionNonce.matchesClaim('', ''), false);
  assert.equal(SessionNonce.matchesClaim('h1', undefined), false);
  assert.equal(codeOf(() => SessionNonce.assertMatchesClaim('h1', '')), AuthError.NONCE_MISMATCH);
  assert.doesNotThrow(() => SessionNonce.assertMatchesClaim('h1', 'h1'));
});

test('User.canSignIn needs an active flag and a known role; hasEmail compares exactly', () => {
  assert.equal(User.canSignIn({ active: true, role: 'viewer' }), true);
  assert.equal(User.canSignIn({ active: false, role: 'admin' }), false);
  assert.equal(User.canSignIn({ active: true, role: '' }), false);
  assert.equal(User.hasEmail({ email: 'a@b.c' }, 'a@b.c'), true);
  assert.equal(User.hasEmail({ email: 'a@b.c' }, 'x@b.c'), false);
});

test('AuthError.is recognises only its own errors', () => {
  assert.equal(AuthError.is(AuthError.create('x')), true);
  assert.equal(AuthError.is(new Error('x')), false);
  assert.equal(AuthError.is(null), false);
});
