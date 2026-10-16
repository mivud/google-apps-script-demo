'use strict';
// In-memory implementations of the ports declared in apps-script-shared-kernel-library/src/application/Ports.gs.
const { loadAppsScript } = require('./loadAppsScript');

const FIXED_NOW = '2026-01-02T03:04:05.678Z';

function uuid(number) {
  return `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
}

function createClock(initialIso = FIXED_NOW) {
  let current = new Date(initialIso);
  return { now: () => new Date(current.getTime()), set(iso) { current = new Date(iso); } };
}

// Ids are uuid(1), uuid(2)... so assertions stay deterministic and pass IdRules.
function createIdGenerator() {
  let counter = 0;
  return { newId: () => uuid(++counter) };
}

// TableGateway: readAll/findById return copies, like the sheet-backed table that rebuilds rows on every read.
function createTable(context) {
  const rows = [];
  const FIRST_DATA_ROW = 2;
  return {
    rows,
    readAll: () => rows.map((row) => ({ ...row })),
    findById(id) {
      const wanted = context.IdRules.normalize(id);
      const position = wanted ? rows.findIndex((row) => row.id.toLowerCase() === wanted) : -1;
      return position === -1 ? null : { index: position + FIRST_DATA_ROW, row: { ...rows[position] } };
    },
    append: (row) => { rows.push({ ...row }); },
    update: (index, row) => { rows[index - FIRST_DATA_ROW] = { ...row }; },
    deleteAt: (index) => { rows.splice(index - FIRST_DATA_ROW, 1); },
    deleteWhere(predicate) {
      for (let i = rows.length - 1; i >= 0; i--) if (predicate(rows[i])) rows.splice(i, 1);
    }
  };
}

// Wires fakes through the real Composition steps, so cross-module ports are the production ones.
function createWorld() {
  const context = loadAppsScript();
  const clock = createClock();
  const idGenerator = createIdGenerator();
  const audit = context.AuditStamper.create({ clock, currentUser: { id: () => '' } });
  const core = { idGenerator, audit };
  const repositories = { category: createTable(context), equipment: createTable(context), maintenance: createTable(context) };
  const ports = context.Composition.createCrossModulePorts(repositories);
  const deps = context.Composition.createModuleDeps(core, repositories, ports);
  const app = context.DeviceManagement.Application;
  return {
    context, clock, repositories, deps, app,
    createCategory: (name, parentId) => app.CreateCategory.execute(deps.category, { name, parentId }),
    createEquipment: (input) => app.CreateEquipment.execute(deps.equipment, { name: 'Laptop', ...input }),
    addLog: (input) => app.AddMaintenanceLog.execute(deps.maintenance, { type: 'repair', ...input })
  };
}

// Asserts an ApiError with the given stable code (and optional message).
function expectApiError(code, message) {
  return (error) => error.code === code && (message === undefined || error.message === message);
}

module.exports = { FIXED_NOW, uuid, createWorld, expectApiError };
