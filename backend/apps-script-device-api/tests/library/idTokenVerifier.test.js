'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { loadAppsScript } = require('../harness/loadAppsScript');

const shared = loadAppsScript().SharedKernelLibrary;
const CLIENT_ID = 'client-id.apps.googleusercontent.com';
const TOKEN = 'aaa.bbb.ccc';
const NOW = new Date('2026-05-01T10:00:00.000Z');
const NOW_SECONDS = NOW.getTime() / 1000;

// Apps Script returns signed bytes in a plain array; mirror that.
shared.Utilities = {
  DigestAlgorithm: { SHA_256: 'SHA_256' },
  Charset: { UTF_8: 'UTF_8' },
  computeDigest: (_algorithm, text) => Array.from(crypto.createHash('sha256').update(text).digest()).map((byte) => (byte > 127 ? byte - 256 : byte))
};

function createMemoryStore() {
  const entries = new Map();
  return {
    entries,
    get: (key) => (entries.has(key) ? entries.get(key).value : null),
    put: (key, value, ttl) => { entries.set(key, { value, ttl }); }
  };
}

function claims(overrides) {
  return {
    aud: CLIENT_ID, iss: 'https://accounts.google.com', exp: String(NOW_SECONDS + 3000),
    email_verified: 'true', email: 'ann@example.com', ...overrides
  };
}

// responder: (url, options) => { code, body }
function createVerifier(responder, clientId = CLIENT_ID) {
  const store = createMemoryStore();
  const fetches = [];
  const http = {
    fetch(url, options) {
      fetches.push({ url, options });
      const { code = 200, body } = responder(url, options);
      return { getResponseCode: () => code, getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body)) };
    }
  };
  const verifier = new shared.GoogleIdTokenVerifier({
    settings: { read: (key) => (key === 'GOOGLE_CLIENT_ID' ? clientId : null) },
    clock: { now: () => NOW },
    cache: new shared.CacheVerifiedTokens(store),
    http
  });
  return { verifier, store, fetches };
}

function codeOf(work) {
  try { work(); } catch (error) { return error.code; }
  return null;
}

test('verify returns email and nonce for a valid token and posts the token in the body', () => {
  const { verifier, fetches } = createVerifier(() => ({ body: claims({ nonce: 'hash1' }) }));
  const identity = verifier.verify(TOKEN);
  assert.equal(identity.email, 'ann@example.com');
  assert.equal(identity.nonce, 'hash1');
  assert.equal(fetches[0].options.method, 'post');
  assert.equal(fetches[0].options.payload.id_token, TOKEN);
  assert.equal(fetches[0].url.includes(TOKEN), false);
});

test('a token without a nonce claim gives an empty nonce', () => {
  const { verifier } = createVerifier(() => ({ body: claims() }));
  assert.equal(verifier.verify(TOKEN).nonce, '');
});

test('wrong audience, issuer, unverified email, missing email and expired token are UNAUTHORIZED', () => {
  const bad = [
    { aud: 'other' }, { iss: 'evil.example.com' }, { email_verified: 'false' }, { email_verified: undefined },
    { email: '' }, { email: undefined }, { exp: String(NOW_SECONDS - 1) }, { exp: 'soon' }
  ];
  bad.forEach((overrides) => {
    const { verifier } = createVerifier(() => ({ body: claims(overrides) }));
    assert.equal(codeOf(() => verifier.verify(TOKEN)), 'UNAUTHORIZED', JSON.stringify(overrides));
  });
});

test('both Google issuer spellings and a boolean email_verified are accepted', () => {
  ['accounts.google.com', 'https://accounts.google.com'].forEach((iss) => {
    const { verifier } = createVerifier(() => ({ body: claims({ iss, email_verified: true }) }));
    assert.equal(verifier.verify(TOKEN).email, 'ann@example.com');
  });
});

test('a missing GOOGLE_CLIENT_ID setting refuses every token', () => {
  const { verifier } = createVerifier(() => ({ body: claims() }), null);
  assert.equal(codeOf(() => verifier.verify(TOKEN)), 'UNAUTHORIZED');
});

test('non-200 and unparsable answers are UNAUTHORIZED', () => {
  assert.equal(codeOf(() => createVerifier(() => ({ code: 400, body: {} })).verifier.verify(TOKEN)), 'UNAUTHORIZED');
  assert.equal(codeOf(() => createVerifier(() => ({ body: 'not json' })).verifier.verify(TOKEN)), 'UNAUTHORIZED');
  assert.equal(codeOf(() => createVerifier(() => ({ body: 'null' })).verifier.verify(TOKEN)), 'UNAUTHORIZED');
});

test('implausible tokens are refused without any network call', () => {
  const { verifier, fetches } = createVerifier(() => ({ body: claims() }));
  ['', 'nodots', 'a.b', 'a b.c.d', 'a.b.c?x=1', null, 42, `${'a'.repeat(4097)}.b.c`].forEach((bad) => {
    assert.equal(codeOf(() => verifier.verify(bad)), 'UNAUTHORIZED', String(bad).slice(0, 12));
  });
  assert.equal(fetches.length, 0);
});

test('a verified identity is cached under a hash key for at most 60 s and skips the second fetch', () => {
  const { verifier, store, fetches } = createVerifier(() => ({ body: claims() }));
  verifier.verify(TOKEN);
  verifier.verify(TOKEN);
  assert.equal(fetches.length, 1);
  const [key, entry] = [...store.entries].find(([name]) => name.startsWith('idtoken:'));
  assert.equal(key.includes(TOKEN), false);
  assert.equal(entry.ttl, 60);
});

test('cache lifetime is capped by the remaining token lifetime and skipped when almost expired', () => {
  const short = createVerifier(() => ({ body: claims({ exp: String(NOW_SECONDS + 20) }) }));
  short.verifier.verify(TOKEN);
  assert.equal([...short.store.entries].find(([name]) => name.startsWith('idtoken:'))[1].ttl, 20);
  const almost = createVerifier(() => ({ body: claims({ exp: String(NOW_SECONDS + 0.5) }) }));
  almost.verifier.verify(TOKEN);
  assert.equal([...almost.store.entries].some(([name]) => name.startsWith('idtoken:')), false);
});

test('a refusal is cached for 30 s and the second attempt does not call Google', () => {
  const { verifier, store, fetches } = createVerifier(() => ({ body: claims({ aud: 'other' }) }));
  assert.equal(codeOf(() => verifier.verify(TOKEN)), 'UNAUTHORIZED');
  assert.equal(codeOf(() => verifier.verify(TOKEN)), 'UNAUTHORIZED');
  assert.equal(fetches.length, 1);
  const [key, entry] = [...store.entries].find(([name]) => name.startsWith('idtoken-rejected:'));
  assert.equal(key.includes(TOKEN), false);
  assert.equal(entry.ttl, 30);
});

test('a network failure is not cached so the next attempt can succeed', () => {
  let down = true;
  const { verifier, store, fetches } = createVerifier(() => {
    if (down) throw new Error('network');
    return { body: claims() };
  });
  assert.throws(() => verifier.verify(TOKEN), /network/);
  assert.equal(store.entries.size, 0);
  down = false;
  assert.equal(verifier.verify(TOKEN).email, 'ann@example.com');
  assert.equal(fetches.length, 2);
});

test('Sha256Hasher returns lowercase hex SHA-256 including for non-ASCII text', () => {
  const hasher = new shared.Sha256Hasher();
  assert.equal(hasher.hex('abc'), crypto.createHash('sha256').update('abc').digest('hex'));
  assert.equal(hasher.hex(''), crypto.createHash('sha256').update('').digest('hex'));
  assert.equal(hasher.hex('xin chào'), crypto.createHash('sha256').update('xin chào').digest('hex'));
  assert.match(hasher.hex('x'), /^[0-9a-f]{64}$/);
});
