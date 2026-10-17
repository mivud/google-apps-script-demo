'use strict';
// Loads the expense-api Apps Script files into ONE vm context in clasp push order (same approach as backend/apps-script/tests).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const APP_ROOT = path.resolve(__dirname, '..', '..');
const SHARED_ROOT = path.resolve(APP_ROOT, '..', 'apps-script-shared-kernel-library');
const SOURCE_DIR = 'src';

function listScriptFiles(root, directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return listScriptFiles(root, relative);
    return entry.name.endsWith('.gs') ? [relative] : [];
  });
}

// Google services are never used by unit tests; touching one is a test bug.
function unstubbedService(name) {
  return new Proxy({}, {
    get(_target, property) {
      if (typeof property === 'symbol') return undefined;
      return () => { throw new Error(`${name}.${property} is not stubbed in unit tests`); };
    }
  });
}

function loadProject(root, extraGlobals) {
  const pushOrder = JSON.parse(fs.readFileSync(path.join(root, '.clasp.json'), 'utf8')).filePushOrder;
  // A file missing from filePushOrder would silently be absent in production, so fail loudly.
  assert.deepEqual([...pushOrder].sort(), listScriptFiles(root, SOURCE_DIR).sort());
  const context = vm.createContext({
    ...extraGlobals,
    console,
    SpreadsheetApp: unstubbedService('SpreadsheetApp'),
    LockService: unstubbedService('LockService'),
    PropertiesService: unstubbedService('PropertiesService'),
    Utilities: unstubbedService('Utilities'),
    Session: unstubbedService('Session'),
    ContentService: { MimeType: { JSON: 'JSON' }, createTextOutput: (text) => ({ text }) }
  });
  pushOrder.forEach((file) => {
    new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file }).runInContext(context);
  });
  return context;
}

function loadExpenseApi() {
  const shared = loadProject(SHARED_ROOT);
  return loadProject(APP_ROOT, { SharedKernelLibrary: shared });
}

// Runs fn and returns the stable error code it throws, or null when it does not throw.
function codeOf(fn) {
  try { fn(); } catch (error) { return error.code; }
  return null;
}

module.exports = { loadExpenseApi, codeOf };
