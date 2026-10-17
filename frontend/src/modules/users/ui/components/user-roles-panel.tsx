import { applyAssignmentChange, type AssignmentChange } from '../../../../shared/assignment-change'
import { AssignmentPanel } from '../../../../shared/components/assignment-panel'
import type { Role } from '../../../roles'
import { useI18n } from '../../../../shared/i18n'
import type { User } from '../..'

interface UserRolesPanelProps {
  user: User
  roles: Role[]
  onAssign: (roleId: string) => Promise<unknown>
  onUnassign: (roleId: string) => Promise<unknown>
  // Called after a save, also when it stopped half way, so the page shows the real state.
  onChanged: () => void
  onRefresh: () => void
}

export function UserRolesPanel({ user, roles, onAssign, onUnassign, onChanged, onRefresh }: UserRolesPanelProps) {
  const { t } = useI18n()
  const options = [...roles].sort((a, b) => a.name.localeCompare(b.name)).map((role) => ({ id: role.id, label: role.name }))
  const save = (change: AssignmentChange) => applyAssignmentChange(change, onAssign, onUnassign, onChanged)
  return (
    <AssignmentPanel
      options={options}
      assignedIds={user.roleIds}
      emptyMessage={t('identity.users.rolesNone')}
      legend={t('identity.users.roles')}
      onSave={save}
      onRefresh={onRefresh}
    />
  )
}
