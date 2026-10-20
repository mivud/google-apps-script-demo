'use strict';
// In-memory world for the identity-api: fake sheets behind the real SpreadsheetTable / SheetInstaller / Composition.wire,
// so every test drives the same code paths as production (doPost -> router -> use case -> repository -> sheet).
const crypto = require('node:crypto');
const { loadIdentityApi } = require('./loadAppsScript');

const START_TIME = '2026-10-17T08:30:00.000Z';
const TICK_MS = 1000;
const MAX_ROWS = 1000;
const MAX_COLUMNS = 26;

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const uuid = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

function createFakeSheet(name) {
  const sheet = { name, grid: [], frozenRows: 0, maxColumns: MAX_COLUMNS, log: [] };
  const cell = (row, column) => (sheet.grid[row - 1] && sheet.grid[row - 1][column - 1] !== undefined ? sheet.grid[row - 1][column - 1] : '');
  const isEmptyRow = (row) => !row || row.every((value) => value === '' || value === undefined);
  sheet.getLastRow = () => {
    let last = sheet.grid.length;
    while (last > 0 && isEmptyRow(sheet.grid[last - 1])) last--;
    return last;
  };
  sheet.getLastColumn = () => sheet.grid.reduce((widest, row) => {
    let width = row.length;
    while (width > 0 && (row[width - 1] === '' || row[width - 1] === undefined)) width--;
    return Math.max(widest, width);
  }, 0);
  sheet.getMaxRows = () => Math.max(MAX_ROWS, sheet.grid.length);
  sheet.getMaxColumns = () => sheet.maxColumns;
  sheet.insertRowsAfter = () => {};
  sheet.insertColumnsAfter = (_after, count) => { sheet.maxColumns += count; };
  sheet.setFrozenRows = (count) => { sheet.frozenRows = count; };
  sheet.deleteRow = (index) => { sheet.grid.splice(index - 1, 1); };
  sheet.getRange = (row, column, rowCount = 1, columnCount = 1) => {
    const range = {
      getValues: () => Array.from({ length: rowCount }, (_r, i) =>
        Array.from({ length: columnCount }, (_c, j) => cell(row + i, column + j))),
      setValues: (values) => {
        sheet.log.push({ op: 'setValues', row, column, rowCount, columnCount, values });
        values.forEach((line, i) => line.forEach((value, j) => {
          while (sheet.grid.length < row + i) sheet.grid.push([]);
          sheet.grid[row + i - 1][column + j - 1] = value;
        }));
        return range;
      },
      setNumberFormat: (format) => {
        sheet.log.push({ op: 'format', format, row, column, rowCount, columnCount });
        return range;
      },
      clearContent: () => {
        for (let i = 0; i < rowCount; i++) {
          for (let j = 0; j < columnCount; j++) {
            if (sheet.grid[row + i - 1]) sheet.grid[row + i - 1][column + j - 1] = '';
          }
        }
        return range;
      }
    };
    return range;
  };
  return sheet;
}

function createFakeSpreadsheet() {
  const sheets = {};
  return {
    sheets,
    getSheetByName: (name) => sheets[name] || null,
    insertSheet: (name) => { sheets[name] = createFakeSheet(name); return sheets[name]; }
  };
}

function createFakeSource(spreadsheet) {
  return {
    open: () => spreadsheet,
    noteWrite: () => {},
    readValues(schema) {
      const sheet = spreadsheet.sheets[schema.sheetName];
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return [];
      return sheet.grid.slice(1, lastRow).map((row) =>
        schema.headers.map((_header, i) => (row[i] === undefined ? '' : row[i])));
    }
  };
}

// options.beforeInstall(world): lets a test create legacy sheets before the schema installer runs.
function createWorld(options = {}) {
  const context = loadIdentityApi();
  const spreadsheet = createFakeSpreadsheet();
  const source = createFakeSource(spreadsheet);
  const properties = new Map();
  const cacheStore = new Map();
  const cacheRemovals = [];
  const store = {
    get: (key) => (cacheStore.has(key) ? cacheStore.get(key) : null),
    put: (key, value) => { cacheStore.set(key, value); },
    remove: (key) => { cacheRemovals.push(key.replace(/^rows:/, '')); cacheStore.delete(key); }
  };
  const lock = { runs: 0, held: false };
  const identities = new Map();
  let now = new Date(START_TIME);
  let idCounter = 0;

  const core = {
    settings: { read: (key) => (properties.has(key) ? properties.get(key) : null), write: (key, value) => properties.set(key, value) },
    source,
    rowCache: new context.ScriptRowCache(store),
    hasher: { hex: sha },
    clock: { now: () => new Date(now.getTime()) },
    ids: { newId: () => uuid(++idCounter) },
    tokenVerifier: {
      verify(token) {
        if (!identities.has(token)) throw context.ApiError.unauthorized();
        return identities.get(token);
      }
    },
    lockGuard: {
      runExclusive(work) {
        lock.runs++;
        lock.held = true;
        try { return work(); } finally { lock.held = false; }
      }
    }
  };
  const app = context.Composition.wire(core);
  context.Composition.createApp = () => app;

  const world = {
    context, spreadsheet, lock, cacheRemovals, cacheStore, core,
    sheet: (name) => spreadsheet.sheets[name],
    // Registers an ID token for an email; `nonce` is the raw client nonce the token is bound to.
    tokenFor(email, nonce = '') {
      const token = `token:${email}:${nonce}`;
      identities.set(token, { email, nonce: nonce ? sha(nonce) : '' });
      return token;
    },
    advance: (ms = TICK_MS) => { now = new Date(now.getTime() + ms); },
    // One request through the real entry point; the clock moves on so last_modified values differ.
    call(action, payload, as) {
      world.advance();
      // An email gets a valid token; anything else is sent as-is (so unregistered strings are invalid tokens).
      const idToken = as !== undefined && !as.startsWith('token:') && as.includes('@') ?world.tokenFor(as) : (as || 'unknown-token');
      const output = context.doPost({ postData: { contents: JSON.stringify({ idToken, action, payload }) } });
      return JSON.parse(output.text);
    },
    // Writes a raw row (as the owner would by hand); bypasses the API and the cache.
    addRow(sheetName, values) {
      const sheet = world.sheet(sheetName);
      const headers = sheet.grid[0];
      sheet.grid.push(headers.map((header) => (values[header] === undefined ? '' : values[header])));
      cacheStore.clear();
    },
    rows(sheetName) {
      const sheet = world.sheet(sheetName);
      const headers = sheet.grid[0];
      return sheet.grid.slice(1, sheet.getLastRow()).map((row) =>
        Object.fromEntries(headers.map((header, i) => [header, row[i] === undefined ? '' : row[i]])));
    },
    install() {
      app.schemaInstaller.ensureSchema();
    }
  };
  if (options.beforeInstall) options.beforeInstall(world);
  world.install();
  return world;
}

module.exports = { createWorld, uuid, sha };
