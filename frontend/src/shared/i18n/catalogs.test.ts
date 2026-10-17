import { describe, expect, it } from 'vitest'
import { en } from './en'
import { vi } from './vi'

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

describe('message catalogs', () => {
  it('names the product Nexus Gate in the browser tab title', () => {
    expect(en['app.name']).toBe('Nexus Gate')
    expect(vi['app.name']).toBe('Nexus Gate')
  })

  it('has the same keys in English and Vietnamese', () => {
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort())
  })

  it('uses the same placeholders in both languages', () => {
    const mismatched = Object.keys(en).filter((key) => {
      const messageKey = key as keyof typeof en
      return placeholders(en[messageKey]).join() !== placeholders(vi[messageKey]).join()
    })
    expect(mismatched).toEqual([])
  })
})
