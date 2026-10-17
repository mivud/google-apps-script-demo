// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useHasPermission } from '../modules/access-control'
import { useCanWriteDevices } from '../modules/device-management/ui/use-can-write-devices'
import { sessionOf, sessionWrapper } from '../shared/testing/session-wrapper'
import { useCanWriteIdentity } from './identity/use-can-write-identity'

const check = <T,>(hook: () => T, roles: string[], permissions: string[]) =>
  renderHook(hook, { wrapper: sessionWrapper(sessionOf(roles, permissions)) }).result.current

describe.each([
  ['useCanWriteDevices', useCanWriteDevices, 'device.mgt.write', 'device.mgt.read'],
  ['useCanWriteIdentity', useCanWriteIdentity, 'identity.write', 'identity.read'],
])('%s', (_name, hook, write, read) => {
  it('passes for super and for the exact write permission', () => {
    expect(check(hook, ['super'], [])).toBe(true)
    expect(check(hook, ['editor'], [write])).toBe(true)
  })

  it('denies other keys, similar values and read-only access', () => {
    expect(check(hook, ['editor'], [read])).toBe(false)
    expect(check(hook, ['editor'], [`${write}.x`, write.toUpperCase(), ` ${write}`])).toBe(false)
    expect(check(hook, ['editor'], [])).toBe(false)
  })
})

describe('useHasPermission', () => {
  it('does not treat write as read and is false without a session', () => {
    expect(check(() => useHasPermission('identity.read'), ['editor'], ['identity.write'])).toBe(false)
    expect(renderHook(() => useHasPermission('identity.read'), { wrapper: sessionWrapper(null) }).result.current).toBe(false)
  })
})
