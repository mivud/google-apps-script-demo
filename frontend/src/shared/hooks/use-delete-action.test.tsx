// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp, setupDomTests } from '../testing/render-app'
import { useDeleteAction } from './use-delete-action'

setupDomTests()

interface HarnessProps {
  remove: (name: string) => Promise<unknown>
  onDeleted?: (name: string) => void
}

function Harness({ remove, onDeleted }: HarnessProps) {
  const action = useDeleteAction({ getName: (name: string) => name, remove, onDeleted })
  return (
    <>
      <button type="button" onClick={() => action.ask('admin')}>open</button>
      {action.dialog}
    </>
  )
}

const yes = () => screen.getByRole('button', { name: /Yes/ }) as HTMLButtonElement
const no = () => screen.getByRole('button', { name: 'No' }) as HTMLButtonElement

describe('useDeleteAction', () => {
  it('asks first and deletes nothing until Yes is pressed', () => {
    const remove = vi.fn().mockResolvedValue(undefined)
    renderApp(<Harness remove={remove} />)
    expect(screen.queryByText('Delete admin?')).toBeNull()
    fireEvent.click(screen.getByText('open'))
    expect(screen.getByText('Delete admin?')).toBeTruthy()
    expect(remove).not.toHaveBeenCalled()
  })

  it('closes without deleting when No is pressed', () => {
    const remove = vi.fn()
    renderApp(<Harness remove={remove} />)
    fireEvent.click(screen.getByText('open'))
    fireEvent.click(no())
    expect(screen.queryByText('Delete admin?')).toBeNull()
    expect(remove).not.toHaveBeenCalled()
  })

  it('locks Yes and No while the call is pending, then closes and shows a success toast', async () => {
    let finish: () => void = () => {}
    const remove = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    const onDeleted = vi.fn()
    renderApp(<Harness remove={remove} onDeleted={onDeleted} />)
    fireEvent.click(screen.getByText('open'))
    fireEvent.click(yes())
    await waitFor(() => expect(no().disabled).toBe(true))
    expect(yes().disabled).toBe(true)
    expect(onDeleted).not.toHaveBeenCalled()
    finish()
    await waitFor(() => expect(screen.queryByText('Delete admin?')).toBeNull())
    expect(screen.getByRole('status').textContent).toContain('"admin" was deleted.')
    expect(onDeleted).toHaveBeenCalledWith('admin')
  })

  it('closes and shows a translated error toast when the call fails', async () => {
    const remove = vi.fn().mockRejectedValue(new Error('boom'))
    const onDeleted = vi.fn()
    renderApp(<Harness remove={remove} onDeleted={onDeleted} />)
    fireEvent.click(screen.getByText('open'))
    fireEvent.click(yes())
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.queryByText('Delete admin?')).toBeNull()
    expect(onDeleted).not.toHaveBeenCalled()
  })
})
