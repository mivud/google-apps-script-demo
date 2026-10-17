import { describe, expect, it } from 'vitest'
import type { Role } from '../../roles'
import { roleNamesFor } from './role-names'

const role = (id: string, name: string) => ({ id, name }) as Role

describe('roleNamesFor', () => {
  it('maps ids to sorted names and skips unknown ids', () => {
    const roles = [role('1', 'viewer'), role('2', 'admin')]
    expect(roleNamesFor(['1', '2', '9'], roles)).toEqual(['admin', 'viewer'])
  })
})
