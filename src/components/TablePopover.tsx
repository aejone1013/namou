import type { TableInfo } from '@/data/dummy'

interface TablePopoverProps {
  table: TableInfo
  onClose: () => void
}

// Deprecated legacy component kept only for compatibility with stale imports on master.
export default function TablePopover(_props: TablePopoverProps) {
  return null
}
