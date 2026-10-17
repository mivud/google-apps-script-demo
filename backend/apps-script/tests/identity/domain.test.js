'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadIdentityApi, plain } = require('../harness/loadAppsScript');

const context = loadIdentityApi();
const { Claims, Roles, Users, AccessControl, DomainError } = context;
const CODE = DomainError.CODE;

function codeOf(work) {
  try { work(); } catch (error) { return error.code; }
  return null;
}

test('Claim accepts valid pairs and rejects bad keys', () => {
  assert.deepEqual(plain(Claims.Domain.Claim.of('feature.x:y-z_1', 'on')), { key: 'feature.x:y-z_1', value: 'on' });
  ['', 'A', '1a', 'a b', 'a'.repeat(65), null, 5].forEach((key) => {
    assert.equal(codeOf(() => Claims.Domain.Claim.of(key, 'v')), CODE.CLAIM_KEY_INVALID, String(key));
  });
  assert.doesNotThrow(() => Claims.Domain.Claim.of('a'.repeat(64), 'v'));
});

test('Claim values are 1-200 characters without control characters', () => {
  assert.doesNotThrow(() => Claims.Domain.Claim.of('k', 'x'.repeat(200)));
  assert.doesNotThrow(() => Claims.Domain.Claim.of('k', '=SUM(1)'));
  ['', 'x'.repeat(201), 'a\nb', 'a\u0000b', 'a\u007fb', null, 3].forEach((value) => {
    assert.equal(codeOf(() => Claims.Domain.Claim.of('k', value)), CODE.CLAIM_VALUE_INVALID, JSON.stringify(value));
  });
});

test('RoleName follows the documented shape', () => {
  ['ab', 'a1', 'role-name_2', 'a'.repeat(32)].forEach((name) => assert.equal(Roles.Domain.RoleName.of(name), name));
  ['a', 'A1', '1ab', '-ab', 'a b', 'a'.repeat(33), '', null].forEach((name) => {
    assert.equal(codeOf(() => Roles.Domain.RoleName.of(name)), CODE.ROLE_NAME_INVALID, String(name));
  });
});

test('RoleDescription allows 0 to 200 characters', () => {
  assert.equal(Roles.Domain.RoleDescription.of(''), '');
  assert.equal(Roles.Domain.RoleDescription.of('x'.repeat(200)).length, 200);
  assert.equal(codeOf(() => Roles.Domain.RoleDescription.of('x'.repeat(201))), CODE.ROLE_DESCRIPTION_INVALID);
  assert.equal(codeOf(() => Roles.Domain.RoleDescription.of(7)), CODE.ROLE_DESCRIPTION_INVALID);
});

test('Email normalizes, and of() rejects bad shapes and over-long values', () => {
  const { Email } = Users.Domain;
  assert.equal(Email.normalize('  Ann@Example.COM '), 'ann@example.com');
  assert.equal(Email.normalize(null), '');
  assert.equal(Email.of(' Ann@Example.com'), 'ann@example.com');
  ['', 'plain', 'a b@c.d', '@c.d', 'a@', null].forEach((bad) => {
    assert.equal(codeOf(() => Email.of(bad)), CODE.USER_EMAIL_INVALID, String(bad));
  });
  assert.equal(codeOf(() => Email.of(`${'a'.repeat(Email.MAX_LENGTH)}@x.io`)), CODE.USER_EMAIL_INVALID);
});

test('built-in roles cannot be renamed or deleted but can be re-described', () => {
  const superRole = Roles.Domain.Role.create({ id: 'r1', name: 'super', description: '', audit: {} });
  assert.equal(codeOf(() => Roles.Domain.Role.edit(superRole, { name: 'boss', description: '', audit: {} })), CODE.ROLE_PROTECTED);
  assert.equal(codeOf(() => Roles.Domain.Role.assertCanDelete(superRole)), CODE.ROLE_PROTECTED);
  assert.equal(Roles.Domain.Role.edit(superRole, { name: 'super', description: 'Everything', audit: {} }).description, 'Everything');
  const custom = Roles.Domain.Role.create({ id: 'r2', name: 'editor', description: '', audit: {} });
  assert.equal(Roles.Domain.Role.edit(custom, { name: 'writer', description: '', audit: {} }).name, 'writer');
  assert.doesNotThrow(() => Roles.Domain.Role.assertCanDelete(custom));
});

test('limits: 100 claims per role, 100 own claims and 20 roles per user', () => {
  const role = { claims: Array.from({ length: 100 }, (_v, i) => ({ key: 'k', value: String(i) })) };
  assert.equal(codeOf(() => Roles.Domain.Role.assertCanAddClaim(role)), CODE.LIMIT_EXCEEDED);
  assert.equal(codeOf(() => Roles.Domain.Role.assertCanAddClaim({ claims: role.claims.slice(1) })), null);
  const user = { claims: role.claims, roleIds: Array.from({ length: 20 }, (_v, i) => `r${i}`) };
  assert.equal(codeOf(() => Users.Domain.User.assertCanAddClaim(user)), CODE.LIMIT_EXCEEDED);
  assert.equal(codeOf(() => Users.Domain.User.assertCanAssignRole(user)), CODE.LIMIT_EXCEEDED);
  const tooMany = { id: 'u', email: 'a@b.c', active: true, roleIds: user.roleIds.concat(['extra']), audit: {} };
  assert.equal(codeOf(() => Users.Domain.User.create(tooMany)), CODE.LIMIT_EXCEEDED);
});

const { EffectiveAccess, PrimaryRole, SuperLockoutRule, SessionNonce } = AccessControl.Domain;
const claim = (key, value) => ({ key, value });
const R1 = { id: 'r1', name: 'alpha', claims: [claim('a', '1'), claim('b', '2')] };
const R2 = { id: 'r2', name: 'beta', claims: [claim('a', '3')] };
const userWith = (overrides) => ({ email: 'u@x.io', active: true, legacyRole: '', roleIds: ['r1', 'r2'], claims: [], ...overrides });
const effective = (user) => plain(EffectiveAccess.resolve(user, [R1, R2]).claims);

test('effective claims: contract test vectors', () => {
  assert.deepEqual(effective(userWith({})), [claim('a', '1'), claim('a', '3'), claim('b', '2')]);
  assert.deepEqual(effective(userWith({ claims: [claim('a', '9')] })), [claim('a', '1'), claim('a', '3'), claim('a', '9'), claim('b', '2')]);
  assert.deepEqual(effective(userWith({ claims: [claim('b', '2')] })), [claim('a', '1'), claim('a', '3'), claim('b', '2')]);
});

test('effective claims: duplicates across roles are removed and order is plain string compare', () => {
  const twin = { id: 'r3', name: 'gamma', claims: [claim('a', '1'), claim('B', 'x'), claim('a', '10')] };
  const access = EffectiveAccess.resolve(userWith({ roleIds: ['r1', 'r3'] }), [R1, twin]);
  assert.deepEqual(plain(access.claims), [claim('B', 'x'), claim('a', '1'), claim('a', '10'), claim('b', '2')]);
});

test('primary role: super wins (exact name), else the first name sorted, else empty', () => {
  const roles = [{ id: 's', name: 'super', claims: [] }, { id: 'v', name: 'zeta', claims: [] }, { id: 'e', name: 'editor', claims: [] },
    { id: 'c', name: 'Super', claims: [] }];
  const roleOf = (roleIds) => EffectiveAccess.resolve(userWith({ roleIds }), roles).role;
  assert.equal(roleOf(['v', 's', 'e']), 'super');
  assert.equal(roleOf(['v', 'e']), 'editor');
  assert.equal(roleOf(['c']), 'Super');
  assert.equal(roleOf([]), '');
  assert.deepEqual(plain(EffectiveAccess.resolve(userWith({ roleIds: ['v', 's'] }), roles).roles), ['super', 'zeta']);
  assert.equal(PrimaryRole.fromRoleNames(['Super', 'admin']), 'Super');
});

test('the legacy users.role column plays no part in the effective access', () => {
  const roles = [{ id: 'a', name: 'super', claims: [] }];
  const access = EffectiveAccess.resolve(userWith({ roleIds: [], legacyRole: 'super' }), roles);
  assert.deepEqual(plain(access), { email: 'u@x.io', role: '', roles: [], claims: [] });
});

test('only inactive users cannot sign in; a user without roles or claims can', () => {
  assert.equal(EffectiveAccess.canSignIn(userWith({ roleIds: ['r1'] })), true);
  assert.equal(EffectiveAccess.canSignIn(userWith({ roleIds: [] })), true);
  assert.equal(EffectiveAccess.canSignIn(userWith({ roleIds: ['r1'], active: false })), false);
});

test('SuperLockoutRule: last super and self lockout', () => {
  const superUser = (email) => ({ email, active: true, isSuper: true });
  const check = (change) => codeOf(() => SuperLockoutRule.assertAllowed(change));
  const base = { actorEmail: 'me@x.io', activeSuperCount: 2 };
  assert.equal(check({ ...base, before: superUser('other@x.io'), after: null }), null);
  assert.equal(check({ ...base, before: superUser('other@x.io'), after: { ...superUser('other@x.io'), active: false } }), null);
  assert.equal(check({ ...base, before: superUser('me@x.io'), after: null }), CODE.SELF_LOCKOUT);
  assert.equal(check({ ...base, before: superUser('me@x.io'), after: { ...superUser('me@x.io'), isSuper: false } }), CODE.SELF_LOCKOUT);
  assert.equal(check({ ...base, before: superUser('me@x.io'), after: superUser('new@x.io') }), CODE.SELF_LOCKOUT);
  assert.equal(check({ ...base, activeSuperCount: 1, before: superUser('other@x.io'), after: null }), CODE.LAST_SUPER);
  assert.equal(check({ ...base, activeSuperCount: 1, before: superUser('other@x.io'), after: { ...superUser('other@x.io'), isSuper: false } }), CODE.LAST_SUPER);
  const plainUser = { email: 'v@x.io', active: true, isSuper: false };
  assert.equal(check({ ...base, activeSuperCount: 1, before: plainUser, after: null }), null);
});

test('SessionNonce parse and claim matching', () => {
  assert.equal(SessionNonce.parse('abcdefghijklmnop'), 'abcdefghijklmnop');
  ['short', 5, null, 'has space has space'].forEach((bad) => assert.equal(codeOf(() => SessionNonce.parse(bad)), CODE.INVALID_NONCE));
  assert.equal(SessionNonce.matchesClaim('h', 'h'), true);
  assert.equal(SessionNonce.matchesClaim('h', ''), false);
  assert.equal(codeOf(() => SessionNonce.assertMatchesClaim('h', 'x')), CODE.NONCE_MISMATCH);
});

test('DomainErrorTranslator keeps the stable code in the VALIDATION message', () => {
  const { DomainErrorTranslator } = context;
  const translate = (error) => plain(DomainErrorTranslator.translate(error));
  assert.deepEqual(translate(DomainError.create(CODE.ROLE_IN_USE)), { code: 'VALIDATION', message: 'role_in_use' });
  assert.equal(translate(DomainError.notFound('Role', 'x')).code, 'NOT_FOUND');
  assert.equal(translate(DomainError.create(CODE.NONCE_MISMATCH)).code, 'UNAUTHORIZED');
  const other = new Error('boom');
  assert.equal(DomainErrorTranslator.translate(other), other);
});
