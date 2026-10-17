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
