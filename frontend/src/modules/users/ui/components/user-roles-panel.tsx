import { AssignmentPanel } from '../../../../shared/components/assignment-panel'
import type { Role } from '../../../roles'
import { useI18n } from '../../../../shared/i18n'
import type { User } from '../..'

interface UserRolesPanelProps {
  user: User
  roles: Role[]
  onAssign: (roleId: string) => Promise<unknown>
  onUnassign: (roleId: string) => Promise<unknown>
  onRefresh: () => void
}

export function UserRolesPanel({ user, roles, onAssign, onUnassign, onRefresh }: UserRolesPanelProps) {
  const { t } = useI18n()
  const assigned = new Set(user.roleIds)
  const byName = (a: Role, b: Role) => a.name.localeCompare(b.name)
  const toItem = (role: Role) => ({ id: role.id, label: role.name })
  return (
    <AssignmentPanel
      items={roles.filter((role) => assigned.has(role.id)).sort(byName).map(toItem)}
      options={roles.filter((role) => !assigned.has(role.id)).sort(byName).map(toItem)}
      emptyMessage={t('identity.users.rolesEmpty')}
      selectLabel={t('identity.users.rolesChoose')}
      onAdd={onAssign}
      onRemove={onUnassign}
      onRefresh={onRefresh}
    />
  )
}
