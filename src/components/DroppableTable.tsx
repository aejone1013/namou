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
    <>
      {/* 드롭 영역: 테이블 전체를 감싸는 absolute div */}
      <div
        ref={setNodeRef}
        className="absolute"
        style={{
          left: table.x,
          top: table.y,
          width: table.width,
          height: table.height,
          zIndex: isOver ? 15 : 10,
        }}
      />

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
            'rounded-2xl'
          )}
          style={{
            left: table.x - 4,
            top: table.y - 4,
            width: table.width + 8,
            height: table.height + 8,
            zIndex: 14,
          }}
        >
          {isOver && (
            <span className="text-[11px] font-bold text-primary bg-surface/90 px-2 py-1 rounded-full shadow-sm">
              여기에 배정
            </span>
          )}
        </div>
      )}
    </>
  )
}
