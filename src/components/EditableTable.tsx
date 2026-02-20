import { useRef, useCallback, useState } from 'react'
import { Users, Move, GripHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { TableInfo } from '@/data/dummy'
import { TABLE_WIDTH, TABLE_BASE_HEIGHT } from '@/data/dummy'
import { useReservationStore } from '@/store/useReservationStore'

interface EditableTableProps {
  table: TableInfo
}

const DRAG_THRESHOLD = 4

export default function EditableTable({ table }: EditableTableProps) {
  const { selectedTableIds, selectTable, toggleSelectTable, moveTable, resizeTable } = useReservationStore()
  const isSelected = selectedTableIds.includes(table.id)
  const tableRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 클릭 vs 드래그 구분
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const isCtrl = e.ctrlKey || e.metaKey
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

        if (!hasMoved) {
          // Ctrl+클릭: 다중 선택 토글
          if (isCtrl) {
            toggleSelectTable(table.id)
          } else {
            // 일반 클릭: 단일 선택 토글
            selectTable(isSelected ? null : table.id)
          }
        } else {
          if (!isSelected) {
            selectTable(table.id)
          }
        }
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [table.id, table.x, table.y, moveTable, selectTable, toggleSelectTable, isSelected]
  )

  // 세로 리사이즈 핸들 (가로 고정, 세로만 변경)
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const startY = e.clientY
      const startH = table.height

      const handleMouseMove = (ev: MouseEvent) => {
        const dh = ev.clientY - startY
        const newH = Math.max(TABLE_BASE_HEIGHT, startH + dh)
        resizeTable(table.id, TABLE_WIDTH, Math.round(newH))
      }

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [table.id, table.height, resizeTable]
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
        'rounded-2xl',
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

      {/* 선택 시 세로 리사이즈 핸들 (하단 중앙) */}
      {isSelected && (
        <div
          onMouseDown={handleResizeMouseDown}
          className={cn(
            'absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-4',
            'bg-primary rounded-lg cursor-s-resize',
            'flex items-center justify-center',
            'shadow-md hover:scale-110 transition-transform'
          )}
        >
          <GripHorizontal size={10} className="text-white" />
        </div>
      )}
    </div>
  )
}
