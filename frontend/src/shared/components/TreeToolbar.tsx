import { Button } from './Button'
import { Icon } from './Icon'

interface TreeToolbarProps {
  expandAllLabel: string
  collapseAllLabel: string
  onExpandAll: () => void
  onCollapseAll: () => void
}

export function TreeToolbar({ expandAllLabel, collapseAllLabel, onExpandAll, onCollapseAll }: TreeToolbarProps) {
  return (
    <div className="tree-toolbar">
      <Button variant="outline" size="sm" onClick={onExpandAll}><Icon name="expandAll" />{expandAllLabel}</Button>
      <Button variant="outline" size="sm" onClick={onCollapseAll}><Icon name="collapseAll" />{collapseAllLabel}</Button>
    </div>
  )
}
