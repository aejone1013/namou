import { useState } from 'react'
import { Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { TableInfo } from '@/data/dummy'
import TablePopover from './TablePopover'

interface TableShapeProps {
  table: TableInfo
}

const statusStyles = {
  available: {
    bg: 'bg-available-light',
    border: 'border-available/30',
    text: 'text-green-700',
    label: '비어있음',
    shadow: 'shadow-green-100',
  },
  occupied: {
    bg: 'bg-occupied-light',
    border: 'border-occupied/30',
    text: 'text-red-600',
    label: '사용중',
    shadow: 'shadow-red-100',
  },
  reserved: {
    bg: 'bg-reserved-light',
    border: 'border-reserved/40',
    text: 'text-yellow-700',
    label: '예약됨',
    shadow: 'shadow-yellow-100',
  },
}

export default function TableShape({ table }: TableShapeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const style = statusStyles[table.status]

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen((prev) => !prev)
  }

  return (
    <>
      <div
        onClick={handleClick}
        className={cn(
          'absolute flex flex-col items-center justify-center',
          'border-2 cursor-pointer group/table',
          'hover:scale-105 transition-all duration-200',
          'shadow-lg',
          style.bg,
          style.border,
          style.shadow,
          isOpen && 'ring-2 ring-primary/30 scale-105',
          'rounded-2xl'
        )}
        style={{
          left: table.x,
          top: table.y,
          width: table.width,
          height: table.height,
        }}
      >
        <span className="text-base font-bold text-charcoal">{table.label}</span>
        <div className="flex items-center gap-1 mt-1">
          <Users size={12} className="text-charcoal-lighter" />
          <span className="text-xs text-charcoal-light">{table.seats}</span>
        </div>
        <span className={cn('text-[10px] font-medium mt-1', style.text)}>
          {style.label}
        </span>
        {table.reservation && (
          <span className="text-[10px] text-charcoal-lighter mt-0.5 max-w-[90%] truncate">
            {table.reservation}
          </span>
        )}
      </div>

      {/* 좌클릭 팝오버 */}
      {isOpen && (
        <TablePopover table={table} onClose={() => setIsOpen(false)} />
      )}
    </>
  )
}
