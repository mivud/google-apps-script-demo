'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadExpenseApi, codeOf } = require('./harness/loadExpenseApi');

const domain = loadExpenseApi().ExpenseTracking.Domain;

test('CalendarDate accepts real dates and rejects impossible ones', () => {
  assert.equal(domain.CalendarDate.parse('2024-02-29'), '2024-02-29');
  ['2026-02-30', '2025-02-29', '2026-13-01', '0050-01-01', '2026-1-01', '', null, 20260101].forEach((bad) => {
    assert.equal(codeOf(() => domain.CalendarDate.parse(bad)), 'spent_on_invalid', String(bad));
  });
  assert.equal(domain.CalendarDate.monthOf('2026-03-15'), '2026-03');
  assert.equal(domain.CalendarDate.firstDayOf('2026-03'), '2026-03-01');
});

test('PaymentMethodId is trimmed, lowercase and limited', () => {
  assert.equal(domain.PaymentMethodId.parse('  visa-1_2 '), 'visa-1_2');
  assert.equal(domain.PaymentMethodId.parse('a'.repeat(40)).length, 40);
  ['', '   ', 'Visa', 'a b', 'a'.repeat(41), 'a.b', null, 5].forEach((bad) => {
    assert.equal(codeOf(() => domain.PaymentMethodId.parse(bad)), 'payment_method_id_invalid', String(bad));
  });
});

test('PaymentMethodColor lowercases #RRGGBB and treats empty as null', () => {
  assert.equal(domain.PaymentMethodColor.parse('#AbCdEf'), '#abcdef');
  [undefined, null, ''].forEach((empty) => assert.equal(domain.PaymentMethodColor.parse(empty), null));
  ['#abc', 'abcdef', '#abcdeg', '#abcdef0', 5].forEach((bad) => {
    assert.equal(codeOf(() => domain.PaymentMethodColor.parse(bad)), 'payment_method_color_invalid', String(bad));
  });
});

test('StatementClosingDay accepts 1-31 or empty', () => {
  [undefined, null, ''].forEach((empty) => assert.equal(domain.StatementClosingDay.parse(empty), null));
  assert.equal(domain.StatementClosingDay.parse(1), 1);
  assert.equal(domain.StatementClosingDay.parse(31), 31);
  [0, 32, 1.5, '5', -1].forEach((bad) => {
    assert.equal(codeOf(() => domain.StatementClosingDay.parse(bad)), 'payment_method_closing_day_invalid', String(bad));
  });
});

test('StatementMonth requires YYYY-MM with month 01-12', () => {
  assert.equal(domain.StatementMonth.parse('2026-12'), '2026-12');
  ['2026-00', '2026-13', '2026-1', '2026-12-01', '', null].forEach((bad) => {
    assert.equal(codeOf(() => domain.StatementMonth.parse(bad)), 'statement_month_invalid', String(bad));
  });
});

test('MoneyAmount.parse and parseOptional', () => {
  assert.equal(domain.MoneyAmount.parse(1), 1);
  assert.equal(domain.MoneyAmount.parse(1000000000000), 1000000000000);
  [0, -5, 1.5, '10', 1000000000001, NaN].forEach((bad) => {
    assert.equal(codeOf(() => domain.MoneyAmount.parse(bad)), 'amount_invalid', String(bad));
  });
  [undefined, null, '', 0].forEach((empty) => assert.equal(domain.MoneyAmount.parseOptional(empty), null));
  assert.equal(domain.MoneyAmount.parseOptional(250000), 250000);
  [-1, 2.5, '5'].forEach((bad) => {
    assert.equal(codeOf(() => domain.MoneyAmount.parseOptional(bad)), 'amount_invalid', String(bad));
  });
});

test('TotalMonths: empty or 0 is unlimited, otherwise 1-1200', () => {
  [undefined, null, '', 0].forEach((empty) => assert.equal(domain.TotalMonths.parse(empty), null));
  assert.equal(domain.TotalMonths.parse(1200), 1200);
  [-1, 1201, 1.5, '3'].forEach((bad) => {
    assert.equal(codeOf(() => domain.TotalMonths.parse(bad)), 'total_months_invalid', String(bad));
  });
});

test('ExpenseDescription is trimmed and 1-200 characters', () => {
  assert.equal(domain.ExpenseDescription.normalize('  Rent '), 'Rent');
  assert.equal(domain.ExpenseDescription.normalize('x'.repeat(200)).length, 200);
  ['', '   ', 'x'.repeat(201), null, 7].forEach((bad) => {
    assert.equal(codeOf(() => domain.ExpenseDescription.normalize(bad)), 'description_invalid', String(bad));
  });
});

test('StatementCycle: closing day is inclusive, short months cap it, December rolls over', () => {
  const resolve = (date, day) => domain.StatementCycle.resolveStatementMonth(date, day);
  assert.equal(resolve('2026-03-15', null), '2026-03');
  assert.equal(resolve('2026-03-15', 15), '2026-03');
  assert.equal(resolve('2026-03-16', 15), '2026-04');
  assert.equal(resolve('2026-02-28', 31), '2026-02');
  assert.equal(resolve('2024-02-29', 30), '2024-02');
  assert.equal(resolve('2026-04-30', 31), '2026-04');
  assert.equal(resolve('2026-12-20', 15), '2027-01');
  assert.equal(resolve('2026-12-15', 15), '2026-12');
  assert.equal(resolve('2026-01-01', 1), '2026-01');
  assert.equal(resolve('2026-01-02', 1), '2026-02');
});

test('PaymentDay accepts 1..31 and treats empty as null', () => {
  [1, 15, 31].forEach((day) => assert.equal(domain.PaymentDay.parse(day), day));
  [undefined, null, ''].forEach((empty) => assert.equal(domain.PaymentDay.parse(empty), null));
  [0, 32, -1, 1.5, '5', NaN, true].forEach((bad) => {
    assert.equal(codeOf(() => domain.PaymentDay.parse(bad)), 'payment_day_invalid', String(bad));
  });
});

test('CalendarDate.dayOf clamps the day to the month length', () => {
  assert.equal(domain.CalendarDate.dayOf('2026-03', 5), '2026-03-05');
  assert.equal(domain.CalendarDate.dayOf('2026-03', 31), '2026-03-31');
  assert.equal(domain.CalendarDate.dayOf('2026-04', 31), '2026-04-30');
  assert.equal(domain.CalendarDate.dayOf('2026-02', 31), '2026-02-28');
  assert.equal(domain.CalendarDate.dayOf('2024-02', 31), '2024-02-29');
  assert.equal(domain.CalendarDate.dayOf('2024-02', 29), '2024-02-29');
  assert.equal(domain.CalendarDate.dayOf('2026-12', 31), '2026-12-31');
});

const PAY_AUDIT = { created: 'c', createdBy: 'a', lastModified: 'm', lastModifiedBy: 'a' };

test('FixedExpenseTemplate stores paymentDay on create and edit', () => {
  const create = (fields) => domain.FixedExpenseTemplate.create({ id: 't', description: 'Rent', audit: PAY_AUDIT, ...fields });
  const template = create({ paymentDay: 15 });
  assert.equal(template.paymentDay, 15);
  assert.equal(create({}).paymentDay, null);
  assert.equal(codeOf(() => create({ paymentDay: 40 })), 'payment_day_invalid');
  const edit = (patch) => domain.FixedExpenseTemplate.edit(template, patch, PAY_AUDIT);
  assert.equal(edit({ paymentDay: 31 }).paymentDay, 31);
  assert.equal(edit({ paymentDay: null }).paymentDay, null);
  assert.equal(edit({ description: 'Flat' }).paymentDay, 15);
  assert.equal(codeOf(() => edit({ paymentDay: 0 })), 'payment_day_invalid');
});

test('Expense.fromTemplate uses paymentDay for spentOn and keeps statementMonth', () => {
  const build = (paymentDay) => domain.FixedExpenseTemplate.create({
    id: 't', description: 'Rent', amount: 100, paymentMethodId: 'cash', paymentDay, audit: PAY_AUDIT
  });
  const from = (template, month) => domain.Expense.fromTemplate(template, month, { id: 'e', description: 'Rent', audit: PAY_AUDIT });
  const withDay = from(build(31), '2026-02');
  assert.equal(withDay.spentOn, '2026-02-28');
  assert.equal(withDay.statementMonth, '2026-02');
  assert.equal(from(build(10), '2026-03').spentOn, '2026-03-10');
  const without = from(build(null), '2026-03');
  assert.equal(without.spentOn, '2026-03-01');
  assert.equal(without.statementMonth, '2026-03');
  assert.equal(without.isFixed, true);
  assert.equal(without.paidAt, null);
});

test('Expense.markPaid / markUnpaid work on fixed expenses only', () => {
  const base = { description: 'Rent', amount: 1, paymentMethodId: 'cash', spentOn: '2026-03-01', audit: PAY_AUDIT };
  const fixed = domain.Expense.create({ ...base, id: 'e', isFixed: true });
  const paid = domain.Expense.markPaid(fixed, '2026-03-05T00:00:00.000+00:00', PAY_AUDIT);
  assert.equal(paid.paidAt, '2026-03-05T00:00:00.000+00:00');
  assert.equal(fixed.paidAt, null);
  assert.equal(domain.Expense.markUnpaid(paid, PAY_AUDIT).paidAt, null);
  const manual = domain.Expense.create({ ...base, id: 'm', paidAt: 'x' });
  assert.equal(manual.paidAt, null);
  assert.equal(codeOf(() => domain.Expense.markPaid(manual, 'x', PAY_AUDIT)), 'expense_not_fixed');
  assert.equal(codeOf(() => domain.Expense.markUnpaid(manual, PAY_AUDIT)), 'expense_not_fixed');
});
