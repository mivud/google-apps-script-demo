// Converts an expense-tracking Google Sheets export (.xlsx) into an idempotent SQL import for Supabase.
// Usage: node import-expense-xlsx.mjs <input.xlsx> [output.sql]
// Needs no dependencies. The output holds personal data: run it in the Supabase SQL editor, never commit it.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DEFAULT_OUTPUT = 'data/expense-import.sql';
const EMPTY_ROW_KEY = 'id';

const AUDIT_COLUMNS = ['created', 'created_by', 'last_modified', 'last_modified_by'];

// Parents first so foreign keys resolve; the same order is reversed nowhere (no deletes).
const TABLES = [
  {
    name: 'payment_methods',
    columns: {
      id: 'text', name: 'text', active: 'bool', statement_closing_day: 'int', color: 'text',
      ...Object.fromEntries(AUDIT_COLUMNS.map((column) => [column, column.endsWith('_by') ? 'text' : 'timestamptz'])),
    },
  },
  {
    name: 'fixed_expense_templates',
    columns: {
      id: 'text', description: 'text', amount: 'int', payment_method_id: 'text', total_months: 'int',
      payment_day: 'int', months_added: 'int', active: 'bool',
      ...Object.fromEntries(AUDIT_COLUMNS.map((column) => [column, column.endsWith('_by') ? 'text' : 'timestamptz'])),
    },
  },
  {
    name: 'expenses',
    columns: {
      id: 'text', description: 'text', amount: 'int', payment_method_id: 'text', spent_on: 'text',
      statement_month: 'text', is_fixed: 'bool', template_id: 'text', paid_at: 'timestamptz',
      ...Object.fromEntries(AUDIT_COLUMNS.map((column) => [column, column.endsWith('_by') ? 'text' : 'timestamptz'])),
    },
  },
];

const REFERENCES = [
  { table: 'fixed_expense_templates', column: 'payment_method_id', parent: 'payment_methods' },
  { table: 'expenses', column: 'payment_method_id', parent: 'payment_methods' },
  { table: 'expenses', column: 'template_id', parent: 'fixed_expense_templates' },
];

// --- minimal zip reader (central directory + raw deflate) ---

function readZipEntries(buffer) {
  const endOfCentralDirectory = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endOfCentralDirectory < 0) throw new Error('Not a valid .xlsx (zip) file.');
  const entryCount = buffer.readUInt16LE(endOfCentralDirectory + 10);
  let cursor = buffer.readUInt32LE(endOfCentralDirectory + 16);
  const entries = new Map();
  for (let index = 0; index < entryCount; index += 1) {
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeader = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    const dataStart = localHeader + 30 + buffer.readUInt16LE(localHeader + 26) + buffer.readUInt16LE(localHeader + 28);
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    entries.set(name, method === 0 ? raw : zlib.inflateRawSync(raw));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

// --- xlsx parsing ---

const XML_ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };

function decodeXml(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (entity) => XML_ENTITIES[entity]);
}

function readSharedStrings(entries) {
  const xml = entries.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((item) =>
    decodeXml([...item[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join('')));
}

function columnIndex(letters) {
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function readSheetRows(xml, sharedStrings) {
  return [...xml.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
    const cells = [];
    for (const cell of row[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const value = /<v>([\s\S]*?)<\/v>/.exec(cell[3] ?? '')?.[1];
      const inline = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(cell[3] ?? '')?.[1];
      if (/t="s"/.test(cell[2]) && value !== undefined) cells[columnIndex(cell[1])] = sharedStrings[Number(value)];
      else cells[columnIndex(cell[1])] = decodeXml(inline ?? value ?? '');
    }
    return cells;
  });
}

function readSheets(entries) {
  const workbook = entries.get('xl/workbook.xml').toString('utf8');
  const relations = entries.get('xl/_rels/workbook.xml.rels').toString('utf8');
  const targets = new Map([...relations.matchAll(/<Relationship\b[^>]*>/g)].map((tag) => [
    /Id="([^"]+)"/.exec(tag[0])[1], /Target="([^"]+)"/.exec(tag[0])[1]]));
  const sharedStrings = readSharedStrings(entries);
  const sheets = new Map();
  for (const tag of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(/name="([^"]+)"/.exec(tag[0])[1]);
    const target = targets.get(/r:id="([^"]+)"/.exec(tag[0])[1]);
    const file = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    sheets.set(name, readSheetRows(entries.get(file).toString('utf8'), sharedStrings));
  }
  return sheets;
}

// --- row mapping and validation ---

function toRecords(table, rows) {
  const [header = [], ...body] = rows;
  const missing = Object.keys(table.columns).filter((column) => !header.includes(column));
  if (missing.length > 0) throw new Error(`Sheet "${table.name}" misses columns: ${missing.join(', ')}`);
  return body
    .map((cells) => Object.fromEntries(header.map((column, index) => [column, (cells[index] ?? '').trim()])))
    .filter((record) => record[EMPTY_ROW_KEY] !== '');
}

function toSqlLiteral(value, type, where) {
  if (value === '') return 'null';
  if (type === 'int') {
    const number = Number(value);
    if (!Number.isInteger(number)) throw new Error(`${where}: "${value}" is not a whole number`);
    return String(number);
  }
  if (type === 'bool') {
    if (!/^(true|false)$/i.test(value)) throw new Error(`${where}: "${value}" is not TRUE/FALSE`);
    return value.toLowerCase();
  }
  return `'${value.replaceAll("'", "''")}'`;
}

function assertReferences(data) {
  for (const { table, column, parent } of REFERENCES) {
    const parentIds = new Set(data[parent].map((record) => record.id));
    for (const record of data[table]) {
      if (record[column] !== '' && !parentIds.has(record[column])) {
        throw new Error(`${table}.${column}: "${record[column]}" not found in ${parent} (row ${record.id})`);
      }
    }
  }
}

// --- SQL generation ---

function buildUpsert(table, records) {
  const columns = Object.keys(table.columns);
  const values = records.map((record) => `  (${columns.map((column) =>
    toSqlLiteral(record[column], table.columns[column], `${table.name}.${column} (row ${record.id})`)).join(', ')})`);
  const updates = columns.filter((column) => column !== 'id').map((column) => `${column} = excluded.${column}`);
  return `insert into public.${table.name} (${columns.join(', ')}) values\n${values.join(',\n')}\n`
    + `on conflict (id) do update set ${updates.join(', ')};`;
}

// User triggers would overwrite the audit columns and reset months_added, so they are off while importing.
function buildScript(data) {
  const names = TABLES.map((table) => table.name);
  const toggle = (action) => names.map((name) => `alter table public.${name} ${action} trigger user;`);
  const inserts = TABLES.filter((table) => data[table.name].length > 0)
    .map((table) => buildUpsert(table, data[table.name]));
  return [
    '-- Generated by backend/supabase/scripts/import-expense-xlsx.mjs. Contains personal data: do not commit.',
    '-- Idempotent: rows are upserted by id. Run as the postgres role in the Supabase SQL editor.',
    'begin;', ...toggle('disable'), ...inserts, ...toggle('enable'), 'commit;', '',
  ].join('\n');
}

function main() {
  const [input, output = DEFAULT_OUTPUT] = process.argv.slice(2);
  if (!input) throw new Error('Usage: node import-expense-xlsx.mjs <input.xlsx> [output.sql]');
  const sheets = readSheets(readZipEntries(fs.readFileSync(input)));
  const data = {};
  for (const table of TABLES) {
    if (!sheets.has(table.name)) throw new Error(`Sheet "${table.name}" not found in ${input}`);
    data[table.name] = toRecords(table, sheets.get(table.name));
  }
  assertReferences(data);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, buildScript(data));
  for (const table of TABLES) console.log(`${table.name}: ${data[table.name].length} rows`);
  console.log(`Written ${output}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
