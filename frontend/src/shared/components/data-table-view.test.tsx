// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { toCsv } from '../csv-export'
import { DataTableView, type DataColumn } from './data-table-view'

interface Row { id: string, name: string, status: string }

const columns: DataColumn<Row>[] = [
  { key: 'name', header: 'Name', primary: true, cell: (r) => r.name, exportValue: (r) => r.name },
  { key: 'status', header: 'Status', exportOnly: true, cell: () => null, exportValue: (r) => r.status },
]
const rows: Row[] = [{ id: '1', name: 'Rent', status: 'Paid' }]

describe('DataTableView exportOnly', () => {
  it('does not render an export-only column', () => {
    render(<DataTableView caption="t" columns={columns} rows={rows} getRowKey={(r) => r.id} />)
    expect(screen.getByText('Name')).toBeTruthy()
    expect(screen.queryByText('Status')).toBeNull()
  })

  it('still exports an export-only column', () => {
    expect(toCsv(columns, rows)).toContain('"Status"')
    expect(toCsv(columns, rows)).toContain('"Paid"')
  })
})
