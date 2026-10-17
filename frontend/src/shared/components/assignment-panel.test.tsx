// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp, setupDomTests } from '../testing/render-app'
import { AssignmentPanel } from './assignment-panel'

setupDomTests()

const OPTIONS = [
  { id: 'r1', label: 'admin' },
  { id: 'r2', label: 'viewer' },
  { id: 'r3', label: 'auditor' },
]

function panel(props: Partial<React.ComponentProps<typeof AssignmentPanel>> = {}) {
  return <AssignmentPanel options={OPTIONS} assignedIds={['r1']} emptyMessage="No roles exist yet." legend="Roles" onSave={async () => {}} {...props} />
}

const save = () => screen.getByRole('button', { name: /Save/ }) as HTMLButtonElement
const box = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement

describe('AssignmentPanel', () => {
  it('checks the assigned options and keeps Save disabled until something changes', () => {
    renderApp(panel())
    expect(box('admin').checked).toBe(true)
    expect(box('viewer').checked).toBe(false)
    expect(save().disabled).toBe(true)
  })

  it('sends only the difference when Save is pressed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderApp(panel({ onSave }))
    fireEvent.click(box('viewer'))
    fireEvent.click(box('admin'))
    expect(save().disabled).toBe(false)
    fireEvent.click(save())
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ added: ['r2'], removed: ['r1'] }))
  })

  it('returns to a disabled Save when a change is undone', () => {
    renderApp(panel())
    fireEvent.click(box('viewer'))
    fireEvent.click(box('viewer'))
    expect(save().disabled).toBe(true)
  })

  it('locks the list and Save while saving', async () => {
    let finish: () => void = () => {}
    const onSave = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    renderApp(panel({ onSave }))
    fireEvent.click(box('viewer'))
    fireEvent.click(save())
    await waitFor(() => expect(box('viewer').matches(':disabled')).toBe(true))
    expect(save().disabled).toBe(true)
    finish()
    await waitFor(() => expect(box('viewer').matches(':disabled')).toBe(false))
  })

  it('takes the reloaded assignment as the new baseline', () => {
    const { rerender } = renderApp(panel())
    fireEvent.click(box('viewer'))
    rerender(panel({ assignedIds: ['r1', 'r2'] }))
    expect(box('viewer').checked).toBe(true)
    expect(save().disabled).toBe(true)
  })

  it('shows the empty message when nothing can be assigned', () => {
    renderApp(panel({ options: [], assignedIds: [] }))
    expect(screen.getByText('No roles exist yet.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })
})
