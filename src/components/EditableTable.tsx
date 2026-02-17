import { useRef, useCallback, useState } from 'react'
import { Users, Move, GripVertical } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { TableInfo } from '@/data/dummy'
import { useReservationStore } from '@/store/useReservationStore'

interface EditableTableProps {
  table: TableInfo
}

const DRAG_THRESHOLD = 4

export default function EditableTable({ table }: EditableTableProps) {
  const { selectedTableId, selectTable, moveTable, resizeTable } = useReservationStore()
  const isSelected = selectedTableId === table.id
  const tableRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 클릭 vs 드래그 구분
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startY = e.clientY
      const startTableX = table.x
      const startTableY = table.y
      let hasMoved = false

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY

        if (!hasMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
          return
        }
        hasMoved = true
        setIsDragging(true)

        const newX = Math.max(0, startTableX + dx)
        const newY = Math.max(0, startTableY + dy)
        moveTable(table.id, Math.round(newX), Math.round(newY))
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)

        // 드래그 안 했으면 선택 토글
        if (!hasMoved) {
          selectTable(isSelected ? null : table.id)
        } else {
          selectTable(table.id)
        }
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [table.id, table.x, table.y, moveTable, selectTable, isSelected]
  )

  // 리사이즈 핸들
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startY = e.clientY
      const startW = table.width
      const startH = table.height

      const handleMouseMove = (ev: MouseEvent) => {
        const dw = ev.clientX - startX
        const dh = ev.clientY - startY
        const newW = Math.max(60, startW + dw)
        const newH = Math.max(60, startH + dh)
        resizeTable(table.id, Math.round(newW), Math.round(newH))
      }

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [table.id, table.width, table.height, resizeTable]
  )

  return (
    <div
      ref={tableRef}
      onMouseDown={handleMouseDown}
      className={cn(
        'absolute flex flex-col items-center justify-center',
        'border-2 select-none',
        'transition-shadow duration-100',
        isSelected
          ? 'border-primary shadow-lg shadow-primary/20 z-20'
          : 'border-dashed border-charcoal-lighter/40 hover:border-primary/50',
        isDragging ? 'cursor-grabbing opacity-90' : 'cursor-grab',
        table.shape === 'circle' ? 'rounded-full' : 'rounded-2xl',
        'bg-surface'
      )}
      style={{
        left: table.x,
        top: table.y,
        width: table.width,
        height: table.height,
      }}
    >
      {/* 이동 아이콘 */}
      <Move size={14} className="text-charcoal-lighter mb-0.5" />
      <span className="text-sm font-bold text-charcoal">{table.label}</span>
      <div className="flex items-center gap-1 mt-0.5">
        <Users size={11} className="text-charcoal-lighter" />
        <span className="text-[11px] text-charcoal-light">{table.seats}</span>
      </div>

      {/* 선택 시 리사이즈 핸들 */}
      {isSelected && (
        <div
          onMouseDown={handleResizeMouseDown}
          className={cn(
            'absolute -bottom-2 -right-2 w-5 h-5',
            'bg-primary rounded-lg cursor-se-resize',
            'flex items-center justify-center',
            'shadow-md hover:scale-110 transition-transform'
          )}
        >
          <GripVertical size={10} className="text-white rotate-[-45deg]" />
        </div>
      )}

      {/* 선택 시 크기 인디케이터 */}
      {isSelected && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
          {table.width}×{table.height}
        </div>
      )}
    </div>
  )
}
