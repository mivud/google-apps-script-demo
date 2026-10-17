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
  const admin = Roles.Domain.Role.create({ id: 'r1', name: 'admin', description: '', audit: {} });
  assert.equal(codeOf(() => Roles.Domain.Role.edit(admin, { name: 'boss', description: '', audit: {} })), CODE.ROLE_PROTECTED);
  assert.equal(codeOf(() => Roles.Domain.Role.assertCanDelete(admin)), CODE.ROLE_PROTECTED);
  assert.equal(Roles.Domain.Role.edit(admin, { name: 'admin', description: 'Everything', audit: {} }).description, 'Everything');
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

const { EffectiveAccess, PrimaryRole, AdminLockoutRule, SessionNonce } = AccessControl.Domain;
const claim = (key, value) => ({ key, value });
const R1 = { id: 'r1', name: 'alpha', claims: [claim('a', '1'), claim('b', '2')] };
const R2 = { id: 'r2', name: 'beta', claims: [claim('a', '3')] };
const userWith = (overrides) => ({ email: 'u@x.io', active: true, legacyRole: '', roleIds: ['r1', 'r2'], claims: [], ...overrides });
const effective = (user) => plain(EffectiveAccess.resolve(user, [R1, R2]).claims);

test('effective claims: contract test vectors', () => {
  assert.deepEqual(effective(userWith({})), [claim('a', '1'), claim('a', '3'), claim('b', '2')]);
  assert.deepEqual(effective(userWith({ claims: [claim('a', '9')] })), [claim('a', '9'), claim('b', '2')]);
  assert.deepEqual(effective(userWith({ claims: [claim('b', '2')] })), [claim('a', '1'), claim('a', '3'), claim('b', '2')]);
});

test('effective claims: duplicates across roles are removed and order is plain string compare', () => {
  const twin = { id: 'r3', name: 'gamma', claims: [claim('a', '1'), claim('B', 'x'), claim('a', '10')] };
  const access = EffectiveAccess.resolve(userWith({ roleIds: ['r1', 'r3'] }), [R1, twin]);
  assert.deepEqual(plain(access.claims), [claim('B', 'x'), claim('a', '1'), claim('a', '10'), claim('b', '2')]);
});

test('primary role: admin beats viewer, viewer beats nothing, others give no access', () => {
  const roles = [{ id: 'a', name: 'admin', claims: [] }, { id: 'v', name: 'viewer', claims: [] }, { id: 'e', name: 'editor', claims: [] }];
  const roleOf = (roleIds) => EffectiveAccess.resolve(userWith({ roleIds }), roles).role;
  assert.equal(roleOf(['a', 'v']), 'admin');
  assert.equal(roleOf(['v', 'e']), 'viewer');
  assert.equal(roleOf(['e']), '');
  assert.deepEqual(plain(EffectiveAccess.resolve(userWith({ roleIds: ['v', 'a'] }), roles).roles), ['admin', 'viewer']);
  assert.equal(PrimaryRole.fromRoleNames(['Admin']), 'admin');
});

test('legacy fallback only applies to users without role assignments', () => {
  const roles = [{ id: 'a', name: 'admin', claims: [claim('x', '1')] }, { id: 'e', name: 'editor', claims: [] }];
  const legacy = EffectiveAccess.resolve(userWith({ roleIds: [], legacyRole: ' Admin ' }), roles);
  assert.equal(legacy.role, 'admin');
  assert.deepEqual(plain(legacy.roles), ['admin']);
  assert.deepEqual(plain(legacy.claims), [claim('x', '1')]);
  assert.equal(EffectiveAccess.resolve(userWith({ roleIds: [], legacyRole: 'owner' }), roles).role, '');
  assert.deepEqual(plain(EffectiveAccess.resolve(userWith({ roleIds: [], legacyRole: 'owner' }), roles).roles), []);
  assert.equal(EffectiveAccess.resolve(userWith({ roleIds: ['e'], legacyRole: 'admin' }), roles).role, '');
  assert.equal(EffectiveAccess.resolve(userWith({ roleIds: [], legacyRole: 'viewer' }), []).role, 'viewer');
});

test('inactive or role-less users cannot sign in', () => {
  const roles = [{ id: 'a', name: 'admin', claims: [] }];
  const admin = userWith({ roleIds: ['a'] });
  assert.equal(EffectiveAccess.canSignIn(admin, EffectiveAccess.resolve(admin, roles)), true);
  const inactive = userWith({ roleIds: ['a'], active: false });
  assert.equal(EffectiveAccess.canSignIn(inactive, EffectiveAccess.resolve(inactive, roles)), false);
  const none = userWith({ roleIds: [] });
  assert.equal(EffectiveAccess.canSignIn(none, EffectiveAccess.resolve(none, roles)), false);
});

test('AdminLockoutRule: last admin and self lockout', () => {
  const admin = (email) => ({ email, active: true, role: 'admin' });
  const check = (change) => codeOf(() => AdminLockoutRule.assertAllowed(change));
  const base = { actorEmail: 'me@x.io', activeAdminCount: 2 };
  assert.equal(check({ ...base, before: admin('other@x.io'), after: null }), null);
  assert.equal(check({ ...base, before: admin('other@x.io'), after: { ...admin('other@x.io'), active: false } }), null);
  assert.equal(check({ ...base, before: admin('me@x.io'), after: null }), CODE.SELF_LOCKOUT);
  assert.equal(check({ ...base, before: admin('me@x.io'), after: { ...admin('me@x.io'), role: 'viewer' } }), CODE.SELF_LOCKOUT);
  assert.equal(check({ ...base, before: admin('me@x.io'), after: admin('new@x.io') }), CODE.SELF_LOCKOUT);
  assert.equal(check({ ...base, activeAdminCount: 1, before: admin('other@x.io'), after: null }), CODE.LAST_ADMIN);
  assert.equal(check({ ...base, activeAdminCount: 1, before: admin('other@x.io'), after: { ...admin('other@x.io'), role: '' } }), CODE.LAST_ADMIN);
  const viewer = { email: 'v@x.io', active: true, role: 'viewer' };
  assert.equal(check({ ...base, activeAdminCount: 1, before: viewer, after: null }), null);
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
