'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createWorld } = require('../harness/fakes');
const { plain } = require('../harness/loadAppsScript');

const { context } = createWorld();
const { IdentityClient, AccessControl } = context;
const URL = 'https://script.google.com/macros/s/AKfycbx-abc_123/exec';
const CLIENT_ID = 'client-1';
const NOW = Date.parse('2026-01-01T00:00:00Z');
const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenWith = (claims) => `${b64url({ alg: 'RS256' })}.${b64url(claims)}.sig`;
const TOKEN = tokenWith({ aud: CLIENT_ID, exp: NOW / 1000 + 3600 });
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');

function createClient({ url = URL, response } = {}) {
  const entries = new Map();
  const fetches = [];
  const store = {
    entries,
    get: (key) => (entries.has(key) ? entries.get(key).value : null),
    put: (key, value, ttl) => { entries.set(key, { value, ttl }); }
  };
  const http = {
    fetch(target, options) {
      fetches.push({ target, options });
      if (response instanceof Error) throw response;
      const { code = 200, body } = response;
      return { getResponseCode: () => code, getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body)) };
    }
  };
  const settings = { read: (key) => ({ IDENTITY_API_URL: url, GOOGLE_CLIENT_ID: CLIENT_ID }[key] ?? null) };
  const clock = { now: () => new Date(NOW) };
  const decodeBase64Url = (text) => Buffer.from(text, 'base64url').toString('utf8');
  const client = new IdentityClient({ settings, http, store, hasher: { hex: sha }, clock, decodeBase64Url });
  return { client, store, fetches };
}

const OK = { body: { ok: true, data: { email: 'ann@example.com', role: 'admin' } } };
const refusal = (code) => ({ body: { ok: false, error: { code, message: 'x' } } });

function codeOf(work) {
  try { work(); } catch (error) { return error.code; }
  return null;
}

test('a miss calls identity-api once with the token in the body, then caches the access for 60 s', () => {
  const { client, store, fetches } = createClient({ response: OK });
  assert.deepEqual(plain(client.resolve(TOKEN)), { email: 'ann@example.com', role: 'admin' });
  assert.equal(fetches.length, 1);
  assert.equal(fetches[0].target, URL);
  assert.equal(fetches[0].target.includes(TOKEN), false);
  assert.deepEqual(JSON.parse(fetches[0].options.payload), { action: 'auth.access.resolve', idToken: TOKEN });
  const entry = store.entries.get(`access:${sha(TOKEN)}`);
  assert.equal(entry.ttl, 60);
});

test('a hit returns the cached access without any call', () => {
  const { client, fetches } = createClient({ response: OK });
  client.resolve(TOKEN);
  assert.deepEqual(plain(client.resolve(TOKEN)), { email: 'ann@example.com', role: 'admin' });
  assert.equal(fetches.length, 1);
});

test('UNAUTHORIZED and FORBIDDEN answers are cached 30 s under the token hash and replayed', () => {
  ['UNAUTHORIZED', 'FORBIDDEN'].forEach((code) => {
    const { client, store, fetches } = createClient({ response: refusal(code) });
    assert.equal(codeOf(() => client.resolve(TOKEN)), code);
    assert.equal(codeOf(() => client.resolve(TOKEN)), code);
    assert.equal(fetches.length, 1);
    const entry = store.entries.get(`denied:${sha(TOKEN)}`);
    assert.equal(entry.value, code);
    assert.equal(entry.ttl, 30);
    assert.equal([...store.entries.keys()].some((key) => key.includes(TOKEN)), false);
  });
});

test('an unavailable identity-api is a generic INTERNAL error and is not cached', () => {
  const cases = [
    { response: new Error('network') },
    { response: { code: 500, body: {} } },
    { response: { body: 'not json' } },
    { response: { body: { ok: false, error: { code: 'INTERNAL' } } } },
    { response: { body: { ok: true, data: { email: 'a@b.c' } } } }
  ];
  cases.forEach(({ response }) => {
    const { client, store } = createClient({ response });
    assert.equal(codeOf(() => client.resolve(TOKEN)), 'INTERNAL');
    assert.equal(store.entries.size, 0);
  });
});

test('an untrusted or missing identity URL is refused before any call', () => {
  const bad = [
    'http://script.google.com/macros/s/abc/exec', 'https://evil.example.com/macros/s/abc/exec',
    'https://script.google.com.evil.com/macros/s/abc/exec', 'https://script.google.com/macros/s/abc/dev',
    'https://script.google.com/macros/s/abc/exec?x=1', '', null
  ];
  bad.forEach((url) => {
    const { client, fetches } = createClient({ url, response: OK });
    assert.equal(codeOf(() => client.resolve(TOKEN)), 'INTERNAL', String(url));
    assert.equal(fetches.length, 0);
  });
});

test('a token with a bad shape or length is refused UNAUTHORIZED before cache or network', () => {
  const { client, store, fetches } = createClient({ response: OK });
  ['', 'nodots', 'a.b', 'a b.c.d', null, undefined, 7, `${'a'.repeat(4097)}.b.c`].forEach((bad) => {
    assert.equal(codeOf(() => client.resolve(bad)), 'UNAUTHORIZED', String(bad).slice(0, 12));
  });
  assert.equal(fetches.length, 0);
  assert.equal(store.entries.size, 0);
});

test('a token for another audience, expired, or with an unreadable payload is refused before cache or network', () => {
  const { client, store, fetches } = createClient({ response: OK });
  const bad = [
    tokenWith({ aud: 'someone-else', exp: NOW / 1000 + 3600 }),
    tokenWith({ aud: CLIENT_ID, exp: NOW / 1000 - 1 }),
    tokenWith({ aud: CLIENT_ID }),
    'aaa.bbb.ccc',
    `${b64url({})}.${Buffer.from('[1]').toString('base64url')}.sig`
  ];
  bad.forEach((token) => assert.equal(codeOf(() => client.resolve(token)), 'UNAUTHORIZED'));
  assert.equal(fetches.length, 0);
  assert.equal(store.entries.size, 0);
});

test('the access is never cached longer than the token is valid', () => {
  const { client, store } = createClient({ response: OK });
  const shortLived = tokenWith({ aud: CLIENT_ID, exp: NOW / 1000 + 5 });
  client.resolve(shortLived);
  assert.equal(store.entries.get(`access:${sha(shortLived)}`).ttl, 5);
});

test('AccessControl: admin may read and write', () => {
  assert.doesNotThrow(() => AccessControl.assertCanRead('admin'));
  assert.doesNotThrow(() => AccessControl.assertCanWrite('admin'));
});

test('AccessControl: viewer may read but not write', () => {
  assert.doesNotThrow(() => AccessControl.assertCanRead('viewer'));
  assert.equal(codeOf(() => AccessControl.assertCanWrite('viewer')), 'FORBIDDEN');
});

test('AccessControl: unknown or missing roles are denied everything', () => {
  ['', 'owner', 'ADMIN', undefined, null].forEach((role) => {
    assert.equal(codeOf(() => AccessControl.assertCanRead(role)), 'FORBIDDEN', String(role));
    assert.equal(codeOf(() => AccessControl.assertCanWrite(role)), 'FORBIDDEN', String(role));
  });
});
