'use strict';
// Loads every Apps Script file into ONE vm context, in the exact order clasp pushes them.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const APP_ROOT = path.resolve(__dirname, '..', '..');
// The SharedKernelLibrary library is a separate Apps Script project with its own global scope.
const SHARED_ROOT = path.resolve(APP_ROOT, '..', 'apps-script-shared-kernel-library');
const IDENTITY_ROOT = path.resolve(APP_ROOT, '..', 'apps-script-identity-api');
const SOURCE_DIR = 'src';

function listScriptFiles(projectRoot, directory) {
  return fs.readdirSync(path.join(projectRoot, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return listScriptFiles(projectRoot, relative);
    return entry.name.endsWith('.gs') ? [relative] : [];
  });
}

function readPushOrder(projectRoot) {
  const config = JSON.parse(fs.readFileSync(path.join(projectRoot, '.clasp.json'), 'utf8'));
  return config.filePushOrder;
}

// A forgotten file in filePushOrder would silently be missing in production, so fail loudly.
function assertDiskMatchesPushOrder(projectRoot, pushOrder) {
  assert.deepEqual([...pushOrder].sort(), listScriptFiles(projectRoot, SOURCE_DIR).sort());
}

// Google services are never used by unit tests; touching an unstubbed one is a test bug.
function unstubbedService(name) {
  return new Proxy({}, {
    get(_target, property) {
      if (typeof property === 'symbol') return undefined;
      return () => { throw new Error(`${name}.${property} is not stubbed in unit tests`); };
    }
  });
}

function createContentServiceStub() {
  return {
    MimeType: { JSON: 'JSON' },
    createTextOutput(text) {
      return { text, mimeType: null, setMimeType(type) { this.mimeType = type; return this; } };
    }
  };
}

function createSandbox(extraGlobals = {}) {
  return {
    ...extraGlobals,
    // Apps Script provides `console`; tests may replace console.error to capture server-side logs.
    console,
    SpreadsheetApp: unstubbedService('SpreadsheetApp'),
    LockService: unstubbedService('LockService'),
    PropertiesService: unstubbedService('PropertiesService'),
    Utilities: unstubbedService('Utilities'),
    Session: unstubbedService('Session'),
    ContentService: createContentServiceStub()
  };
}

// Loads one project's files, in clasp push order, into a fresh vm context.
function loadProject(projectRoot, extraGlobals) {
  const pushOrder = readPushOrder(projectRoot);
  assertDiskMatchesPushOrder(projectRoot, pushOrder);
  const context = vm.createContext(createSandbox(extraGlobals));
  pushOrder.forEach((file) => {
    const source = fs.readFileSync(path.join(projectRoot, file), 'utf8');
    new vm.Script(source, { filename: file }).runInContext(context);
  });
  return context;
}

// The library context is exposed to the app as the global `SharedKernelLibrary`, like a real library identifier.
function loadAppsScript() {
  const shared = loadProject(SHARED_ROOT);
  return loadProject(APP_ROOT, { SharedKernelLibrary: shared });
}

// identity-api is a third project with its own global scope; it also imports the library.
function loadIdentityApi() {
  const shared = loadProject(SHARED_ROOT);
  return loadProject(IDENTITY_ROOT, { SharedKernelLibrary: shared });
}

// Objects built inside the vm have another Object prototype; round-trip them before deep comparisons.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { loadAppsScript, loadIdentityApi, plain };
