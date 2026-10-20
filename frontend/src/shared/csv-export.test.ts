import { describe, expect, it } from 'vitest'
import { csvFileName, toCsv } from './csv-export'

interface Row { name: string; qty: number | null }
const columns = [
  { header: 'Name', exportValue: (row: Row) => row.name },
  { header: 'Qty', exportValue: (row: Row) => row.qty },
  { header: 'Actions' },
]

describe('toCsv', () => {
  it('writes BOM, quoted fields, CRLF and skips columns without exportValue', () => {
    expect(toCsv(columns, [{ name: 'Drill', qty: 2 }])).toBe('﻿"Name","Qty"\r\n"Drill","2"\r\n')
  })

  it('escapes quotes and keeps null empty', () => {
    expect(toCsv(columns, [{ name: 'A "b"', qty: null }])).toContain('"A ""b""",""')
  })

  it('neutralizes formula injection in text but not numbers', () => {
    const csv = toCsv(columns, [{ name: '=SUM(A1)', qty: -5 }, { name: '\tx', qty: 1 }])
    expect(csv).toContain('"\'=SUM(A1)","-5"')
    expect(csv).toContain('"\'\tx"')
  })
})

describe('csvFileName', () => {
  it('appends the date and sanitizes the base name', () => {
    expect(csvFileName('my expenses', new Date('2026-10-20T10:00:00Z'))).toBe('my-expenses-2026-10-20.csv')
  })
})
