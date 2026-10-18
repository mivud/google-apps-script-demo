'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadExpenseApi, codeOf } = require('./harness/loadExpenseApi');

const context = loadExpenseApi();
const app = context.ExpenseTracking.Application;
const domain = context.ExpenseTracking.Domain;
const ACTOR = 'ann@example.com';
const AUDIT = { created: 'c', createdBy: ACTOR, lastModified: 'm', lastModifiedBy: ACTOR };

const sameText = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

// In-memory fakes of the repository, audit and id ports.
function createDeps() {
  let counter = 0;
  const methods = [];
  const templateRows = [];
  const expenseRows = [];
  return {
    methods, templateRows, expenseRows,
    audit: { created: () => ({ ...AUDIT }), modified: (audit) => ({ ...audit }) },
    ids: { newId: () => `id-${++counter}` },
    paymentMethods: {
      findById: (id) => methods.find((m) => sameText(m.id, id)) || null,
      findByName: (name) => methods.find((m) => sameText(m.name, name)) || null,
      insert: (m) => { methods.push(m); },
      delete: (id) => { methods.splice(methods.findIndex((m) => m.id === id), 1); }
    },
    templates: {
      list: () => templateRows.slice(),
      update: (t) => { templateRows[templateRows.findIndex((x) => x.id === t.id)] = t; }
    },
    expenses: {
      listByStatementMonth: (month) => expenseRows.filter((e) => e.statementMonth === month),
      insert: (e) => { expenseRows.push(e); }
    },
    usage: {
      isPaymentMethodUsed: (id) => expenseRows.some((e) => e.paymentMethodId === id) || templateRows.some((t) => t.paymentMethodId === id)
    }
  };
}

function addTemplate(deps, fields) {
  deps.templateRows.push(domain.FixedExpenseTemplate.create({ audit: AUDIT, ...fields }));
}

test('CreatePaymentMethod rejects a taken id (ignoring case) and a taken name', () => {
  const deps = createDeps();
  const create = (fields) => app.CreatePaymentMethod.execute(deps, { actor: ACTOR, fields });
  assert.equal(create({ id: 'visa', name: 'Visa' }).id, 'visa');
  assert.equal(codeOf(() => create({ id: 'VISA', name: 'Other' })), 'payment_method_id_invalid');
  assert.equal(codeOf(() => create({ id: 'visa', name: 'Other' })), 'payment_method_id_taken');
  assert.equal(codeOf(() => create({ id: 'other', name: 'VISA' })), 'payment_method_name_taken');
  assert.equal(deps.methods.length, 1);
});

test('DeletePaymentMethod is blocked while an expense references it', () => {
  const deps = createDeps();
  app.CreatePaymentMethod.execute(deps, { actor: ACTOR, fields: { id: 'cash', name: 'Cash' } });
  deps.expenseRows.push({ paymentMethodId: 'cash' });
  assert.equal(codeOf(() => app.DeletePaymentMethod.execute(deps, { id: 'cash' })), 'payment_method_in_use');
  deps.expenseRows.length = 0;
  app.DeletePaymentMethod.execute(deps, { id: 'cash' });
  assert.equal(deps.methods.length, 0);
  assert.equal(codeOf(() => app.DeletePaymentMethod.execute(deps, { id: 'cash' })), 'not_found');
});

test('GenerateFixedExpenses is idempotent per template and month', () => {
  const deps = createDeps();
  addTemplate(deps, { id: 't1', description: 'Rent', amount: 5000000, paymentMethodId: 'cash' });
  addTemplate(deps, { id: 't2', description: 'Gym', active: false });
  const run = (month) => app.GenerateFixedExpenses.execute(deps, { actor: ACTOR, statementMonth: month });

  const first = run('2026-03');
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0].spentOn, '2026-03-01');
  assert.equal(first.items[0].isFixed, true);
  assert.equal(first.skipped, 0);
  assert.equal(deps.templateRows[0].monthsAdded, 1);

  assert.equal(run('2026-03').items.length, 0);
  assert.equal(deps.expenseRows.length, 1);
  assert.equal(deps.templateRows[0].monthsAdded, 1);

  assert.equal(run('2026-04').items.length, 1);
  assert.equal(deps.templateRows[0].monthsAdded, 2);
  assert.equal(codeOf(() => run('2026-13')), 'statement_month_invalid');
});

test('GenerateFixedExpenses stops once totalMonths is reached', () => {
  const deps = createDeps();
  addTemplate(deps, { id: 't1', description: 'Loan', amount: 1000, totalMonths: 1 });
  const run = (month) => app.GenerateFixedExpenses.execute(deps, { actor: ACTOR, statementMonth: month });
  assert.equal(run('2026-03').items.length, 1);
  const next = run('2026-04');
  assert.equal(next.items.length, 0);
  assert.equal(next.skipped, 1);
});

test('GenerateFixedExpenses adds [n/total] to limited templates only', () => {
  const deps = createDeps();
  addTemplate(deps, { id: 't1', description: 'tra gop', amount: 1000, totalMonths: 6 });
  addTemplate(deps, { id: 't2', description: 'Rent', amount: 1000 });
  deps.templateRows[0].monthsAdded = 1;
  const run = (month) => app.GenerateFixedExpenses.execute(deps, { actor: ACTOR, statementMonth: month });
  const descriptionsOf = (result) => result.items.map((e) => e.description);
  assert.deepEqual(descriptionsOf(run('2026-03')), ['tra gop [2/6]', 'Rent']);
  deps.templateRows[0].monthsAdded = 5;
  assert.deepEqual(descriptionsOf(run('2026-04')), ['tra gop [6/6]', 'Rent']);
});

test('describeInstallment truncates the base text to fit the description limit', () => {
  const max = domain.ExpenseDescription.MAX_LENGTH;
  const template = { description: 'x'.repeat(max), totalMonths: 12, monthsAdded: 3 };
  const text = domain.FixedExpenseTemplate.describeInstallment(template);
  assert.equal(text.length, max);
  assert.ok(text.endsWith('x [3/12]'));
  assert.equal(domain.FixedExpenseTemplate.describeInstallment({ ...template, description: 'Loan', totalMonths: null }), 'Loan');
});
