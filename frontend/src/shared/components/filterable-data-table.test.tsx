// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp, setupDomTests } from '../testing/render-app'
import { downloadCsv } from '../csv-export'
import type { DataColumn } from './data-table-view'
import { FilterableDataTable } from './filterable-data-table'

vi.mock('../csv-export', async (importOriginal) => ({ ...(await importOriginal<typeof import('../csv-export')>()), downloadCsv: vi.fn() }))

setupDomTests()

interface Row { id: string; name: string }
const rows: Row[] = [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }]
const columns: DataColumn<Row>[] = [{ key: 'name', header: 'Name', cell: (row) => row.name, exportValue: (row) => row.name }]
const exportName = 'Export the shown rows as a CSV file'

function renderTable(exportFileName?: string) {
  const toolbar = { searchLabel: 'Search rows', searchFields: (row: Row) => [row.name], itemsName: 'rows', exportFileName }
  return renderApp(<FilterableDataTable caption="Rows" columns={columns} rows={rows} getRowKey={(row) => row.id} toolbar={toolbar} />)
}

describe('FilterableDataTable export', () => {
  beforeEach(() => vi.mocked(downloadCsv).mockClear())

  it('shows the Export action only when exportFileName is set', () => {
    renderTable()
    expect(screen.queryByRole('button', { name: exportName })).toBeNull()
  })

  it('exports only the filtered rows', () => {
    renderTable('rows')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search rows' }), { target: { value: 'alp' } })
    fireEvent.click(screen.getByRole('button', { name: exportName }))
    expect(downloadCsv).toHaveBeenCalledOnce()
    const [fileName, csv] = vi.mocked(downloadCsv).mock.calls[0]
    expect(fileName).toMatch(/^rows-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(csv).toContain('Alpha')
    expect(csv).not.toContain('Beta')
  })
})
