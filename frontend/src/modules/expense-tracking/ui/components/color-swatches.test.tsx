// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp, setupDomTests } from '../../../../shared/testing/render-app'
import { PAYMENT_METHOD_COLOR_PRESETS } from '../../domain/payment-method'
import { ColorSwatches } from './color-swatches'

setupDomTests()

const radios = () => screen.getAllByRole('radio') as HTMLInputElement[]
const picker = () => screen.getByLabelText('Custom color') as HTMLInputElement

describe('ColorSwatches', () => {
  it('renders None plus every preset as radios', () => {
    renderApp(<ColorSwatches value="" onChange={() => undefined} />)
    expect(radios()).toHaveLength(PAYMENT_METHOD_COLOR_PRESETS.length + 1)
    expect(radios()[0].checked).toBe(true)
  })

  it('checks the preset matching the value, ignoring case', () => {
    renderApp(<ColorSwatches value={PAYMENT_METHOD_COLOR_PRESETS[2].toUpperCase()} onChange={() => undefined} />)
    expect(radios().filter((radio) => radio.checked)).toHaveLength(1)
    expect(radios()[3].checked).toBe(true)
  })

  it('reports the chosen preset and None', () => {
    const onChange = vi.fn()
    renderApp(<ColorSwatches value={PAYMENT_METHOD_COLOR_PRESETS[0]} onChange={onChange} />)
    fireEvent.click(radios()[2])
    expect(onChange).toHaveBeenLastCalledWith(PAYMENT_METHOD_COLOR_PRESETS[1])
    fireEvent.click(radios()[0])
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('shows a custom color on the picker and leaves every radio unchecked', () => {
    renderApp(<ColorSwatches value="#123456" onChange={() => undefined} />)
    expect(picker().value).toBe('#123456')
    expect(radios().some((radio) => radio.checked)).toBe(false)
  })

  it('reports a color picked in the custom picker', () => {
    const onChange = vi.fn()
    renderApp(<ColorSwatches value="" onChange={onChange} />)
    fireEvent.change(picker(), { target: { value: '#abcdef' } })
    expect(onChange).toHaveBeenCalledWith('#abcdef')
  })

  it('disables every control when disabled', () => {
    renderApp(<ColorSwatches value="" disabled onChange={() => undefined} />)
    expect(screen.getByRole('group').hasAttribute('disabled')).toBe(true)
  })
})
