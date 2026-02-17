import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/cn'
import type { TableInfo } from '@/data/dummy'
import TableShape from './TableShape'

interface DroppableTableProps {
  table: TableInfo
}

export default function DroppableTable({ table }: DroppableTableProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `table-${table.id}`,
    data: { table },
    disabled: table.status !== 'available',
  })

  // 드래그 중일 때만 드롭 하이라이트 표시
  const isDragActive = !!active
  const isAvailable = table.status === 'available'
  const showDropHighlight = isDragActive && isAvailable

  return (
    <div ref={setNodeRef} className="contents">
      <TableShape table={table} />

      {/* 드롭 가능 오버레이 */}
      {showDropHighlight && (
        <div
          className={cn(
            'absolute border-2 border-dashed pointer-events-none',
            'flex items-center justify-center',
            'transition-all duration-150',
            isOver
              ? 'border-primary bg-primary/15 scale-110'
              : 'border-primary/30 bg-primary/5',
            table.shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
          )}
          style={{
            left: table.x - 4,
            top: table.y - 4,
            width: table.width + 8,
            height: table.height + 8,
          }}
        >
          {isOver && (
            <span className="text-[11px] font-bold text-primary bg-surface/90 px-2 py-1 rounded-full shadow-sm">
              여기에 배정
            </span>
          )}
        </div>
      )}
    </div>
  )
}
