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

  const isDragActive = !!active
  const isAvailable = table.status === 'available'
  const showDropHighlight = isDragActive && isAvailable

  return (
    <>
      {/* Droppable zone — pointer-events only active during drag */}
      <div
        ref={setNodeRef}
        className="absolute"
        style={{
          left: table.x,
          top: table.y,
          width: table.width,
          height: table.height,
          zIndex: isOver ? 15 : 10,
          pointerEvents: isDragActive ? 'auto' : 'none',
        }}
      />

      <TableShape table={table} />

      {showDropHighlight && (
        <div
          className={cn(
            'absolute border-2 border-dashed pointer-events-none',
            'flex items-center justify-center',
            'transition-all duration-150',
            isOver
              ? 'border-primary bg-primary/15 scale-110'
              : 'border-primary/30 bg-primary/5',
            'rounded-xl'
          )}
          style={{
            left: table.x - 3,
            top: table.y - 3,
            width: table.width + 6,
            height: table.height + 6,
            zIndex: 14,
          }}
        >
          {isOver && (
            <span className="text-[9px] font-bold text-primary bg-surface/90 px-1.5 py-0.5 rounded-full shadow-sm">
              배정
            </span>
          )}
        </div>
      )}
    </>
  )
}
