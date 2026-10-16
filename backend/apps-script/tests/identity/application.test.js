'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { loadIdentityApi, plain } = require('../harness/loadAppsScript');

const context = loadIdentityApi();
const { Auth } = context;
const { ResolveAccess, GetSession, AccessSupportService } = Auth.Application;
const { AuthErrorTranslator } = Auth.Endpoints;
const AuthError = Auth.Domain.AuthError;
const NONCE = 'nonce-value-123456';
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');

function createDeps(users, identity) {
  const calls = [];
  return {
    calls,
    users: { findByEmail: (email) => users.find((user) => user.email === email) || null },
    tokenVerifier: {
      verify(token) {
        calls.push(token);
        if (token === 'bad') throw context.ApiError.unauthorized();
        return identity;
      }
    },
    hasher: { hex: sha }
  };
}

const ADMIN = { id: '1', email: 'ann@example.com', role: 'admin', active: true };
const INACTIVE = { id: '2', email: 'old@example.com', role: 'viewer', active: false };
const NO_ROLE = { id: '3', email: 'norole@example.com', role: '', active: true };

function codeOf(work) {
  try { work(); } catch (error) { return error.code; }
  return null;
}

test('AccessSupportService returns the active user and maps it to { email, role }', () => {
  const deps = createDeps([ADMIN], null);
  const user = AccessSupportService.requireActiveUser(deps, { email: 'ANN@example.com' });
  assert.equal(user.id, '1');
  assert.deepEqual(plain(AccessSupportService.toAccess(user)), { email: 'ann@example.com', role: 'admin' });
});

test('AccessSupportService refuses unknown, inactive and role-less users with FORBIDDEN', () => {
  const deps = createDeps([ADMIN, INACTIVE, NO_ROLE], null);
  ['nobody@example.com', INACTIVE.email, NO_ROLE.email].forEach((email) => {
    assert.equal(codeOf(() => AccessSupportService.requireActiveUser(deps, { email })), 'FORBIDDEN', email);
  });
});

test('AccessSupportService raises the domain error for an unreadable email', () => {
  const deps = createDeps([ADMIN], null);
  assert.equal(codeOf(() => AccessSupportService.requireActiveUser(deps, { email: 'not-an-email' })), AuthError.INVALID_EMAIL);
});

test('ResolveAccess verifies the token and returns the user access', () => {
  const deps = createDeps([ADMIN], { email: 'ann@example.com', nonce: '' });
  assert.deepEqual(plain(ResolveAccess.execute(deps, { idToken: 'good' })), { email: 'ann@example.com', role: 'admin' });
  assert.deepEqual(plain(deps.calls), ['good']);
});

test('ResolveAccess propagates UNAUTHORIZED and refuses users off the allowlist', () => {
  assert.equal(codeOf(() => ResolveAccess.execute(createDeps([ADMIN], null), { idToken: 'bad' })), 'UNAUTHORIZED');
  const deps = createDeps([INACTIVE], { email: INACTIVE.email, nonce: '' });
  assert.equal(codeOf(() => ResolveAccess.execute(deps, { idToken: 'good' })), 'FORBIDDEN');
});

test('GetSession accepts a token whose nonce claim is the hash of the client nonce', () => {
  const deps = createDeps([ADMIN], { email: ADMIN.email, nonce: sha(NONCE) });
  assert.deepEqual(plain(GetSession.execute(deps, { idToken: 'good', nonce: NONCE })), { email: ADMIN.email, role: 'admin' });
});

test('GetSession refuses missing or wrong nonce claims and malformed nonces', () => {
  const run = (claim, nonce) => codeOf(() => GetSession.execute(
    createDeps([ADMIN], { email: ADMIN.email, nonce: claim }), { idToken: 'good', nonce }));
  assert.equal(run('', NONCE), AuthError.NONCE_MISMATCH);
  assert.equal(run(sha('another-nonce-1234'), NONCE), AuthError.NONCE_MISMATCH);
  assert.equal(run(sha(NONCE), 'short'), AuthError.INVALID_NONCE);
  assert.equal(run(sha(NONCE), undefined), AuthError.INVALID_NONCE);
});

test('GetSession checks the nonce shape before calling the verifier', () => {
  const deps = createDeps([ADMIN], { email: ADMIN.email, nonce: '' });
  codeOf(() => GetSession.execute(deps, { idToken: 'good', nonce: 'x' }));
  assert.equal(deps.calls.length, 0);
});

test('GetSession still enforces the allowlist after the nonce matches', () => {
  const deps = createDeps([INACTIVE], { email: INACTIVE.email, nonce: sha(NONCE) });
  assert.equal(codeOf(() => GetSession.execute(deps, { idToken: 'good', nonce: NONCE })), 'FORBIDDEN');
});

test('AuthErrorTranslator maps invalid email to FORBIDDEN and other auth errors to UNAUTHORIZED', () => {
  assert.equal(AuthErrorTranslator.translate(AuthError.create(AuthError.INVALID_EMAIL)).code, 'FORBIDDEN');
  assert.equal(AuthErrorTranslator.translate(AuthError.create(AuthError.INVALID_NONCE)).code, 'UNAUTHORIZED');
  assert.equal(AuthErrorTranslator.translate(AuthError.create(AuthError.NONCE_MISMATCH)).code, 'UNAUTHORIZED');
});

test('AuthErrorTranslator passes foreign errors and results through', () => {
  const other = new Error('boom');
  assert.equal(AuthErrorTranslator.translate(other), other);
  assert.equal(AuthErrorTranslator.run(() => 7), 7);
  assert.equal(codeOf(() => AuthErrorTranslator.run(() => { throw AuthError.create(AuthError.INVALID_EMAIL); })), 'FORBIDDEN');
});
