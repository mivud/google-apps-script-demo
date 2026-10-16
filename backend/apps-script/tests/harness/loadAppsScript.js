'use strict';
// Loads every Apps Script file into ONE vm context, in the exact order clasp pushes them.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_DIR = 'src';

function listScriptFiles(directory) {
  return fs.readdirSync(path.join(PROJECT_ROOT, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return listScriptFiles(relative);
    return entry.name.endsWith('.gs') ? [relative] : [];
  });
}

function readPushOrder() {
  const config = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, '.clasp.json'), 'utf8'));
  return config.filePushOrder;
}

// A forgotten file in filePushOrder would silently be missing in production, so fail loudly.
function assertDiskMatchesPushOrder(pushOrder) {
  assert.deepEqual([...pushOrder].sort(), listScriptFiles(SOURCE_DIR).sort());
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

function createSandbox() {
  return {
    SpreadsheetApp: unstubbedService('SpreadsheetApp'),
    LockService: unstubbedService('LockService'),
    PropertiesService: unstubbedService('PropertiesService'),
    Utilities: unstubbedService('Utilities'),
    Session: unstubbedService('Session'),
    ContentService: createContentServiceStub()
  };
}

function loadAppsScript() {
  const pushOrder = readPushOrder();
  assertDiskMatchesPushOrder(pushOrder);
  const context = vm.createContext(createSandbox());
  pushOrder.forEach((file) => {
    const source = fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf8');
    new vm.Script(source, { filename: file }).runInContext(context);
  });
  return context;
}

// Objects built inside the vm have another Object prototype; round-trip them before deep comparisons.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { loadAppsScript, plain };
