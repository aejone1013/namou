import { Users, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { getTableNumber } from '@/data/dummy'
import type { TableInfo } from '@/data/dummy'
import { absoluteRectStyle } from '@/features/floor-map/floorMapStyles'
import { useReservationStore } from '@/store/useReservationStore'

interface TableShapeProps {
  table: TableInfo
}

const statusStyles = {
  available: {
    bg: 'bg-available-light',
    border: 'border-available/30',
    shadow: 'shadow-[0_1px_4px_rgba(91,140,90,0.10)]',
  },
  occupied: {
    bg: 'bg-occupied-light',
    border: 'border-occupied/30',
    shadow: 'shadow-[0_1px_4px_rgba(199,91,63,0.10)]',
  },
  reserved: {
    bg: 'bg-reserved-light',
    border: 'border-reserved/40',
    shadow: 'shadow-[0_1px_4px_rgba(196,164,74,0.10)]',
  },
}

export default function TableShape({ table }: TableShapeProps) {
  const { reservations, focusedTableId, mergePreviewTableIds, setFocusedTable } = useReservationStore()
  const effectiveTables = useReservationStore.getState().getEffectiveTables()
  const isOpen = focusedTableId === table.id
  const isMergePreview = mergePreviewTableIds.includes(table.id)
  const tableNum = getTableNumber(table.label)
  const plannedMergeHost = effectiveTables.find((t) => {
    const label = t.nextBooking?.targetLabel
    if (!label || t.id === table.id) return false
    if (!/[+~]/.test(label)) return false
    const plusMatch = label.match(/^T(\d+)\+T(\d+)$/)
    if (plusMatch) {
      const a = parseInt(plusMatch[1], 10)
      const b = parseInt(plusMatch[2], 10)
      return tableNum === a || tableNum === b
    }
    const rangeMatch = label.match(/^T(\d+)~T(\d+)$/)
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10)
      const end = parseInt(rangeMatch[2], 10)
      return tableNum >= Math.min(start, end) && tableNum <= Math.max(start, end)
    }
    return false
  })
  const isPlannedMergeTarget = !!plannedMergeHost
  const style = statusStyles[table.status]

  const linkedReservation = table.currentTeam?.reservationId
    ? reservations.find((r) => r.id === table.currentTeam!.reservationId)
    : null

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFocusedTable(isOpen ? null : table.id)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'absolute flex flex-col items-center justify-center',
        'border-2 cursor-pointer group/table',
        'hover:scale-[1.03] transition-all duration-200',
        'shadow-sm',
        style.bg,
        style.border,
        style.shadow,
        isPlannedMergeTarget && 'ring-2 ring-reserved/25 ring-offset-1 ring-offset-surface/70',
        isMergePreview && 'ring-2 ring-reserved/50 shadow-[0_0_0_3px_rgba(196,164,74,0.10)]',
        isOpen && 'ring-2 ring-primary/30 scale-[1.03]',
        'rounded-xl'
      )}
      style={absoluteRectStyle(table, { zIndex: isOpen ? 25 : 12 })}
    >
      {/* Label + seats */}
      <span className="text-[13px] font-bold text-charcoal leading-none tracking-tight">{table.label}</span>
      <div className="flex items-center gap-0.5 mt-0.5 px-1 py-0.5 rounded-md">
        <Users size={10} className="text-charcoal-lighter" />
        <span className="text-[10px] text-charcoal-light font-medium">{table.seats}</span>
      </div>

      {/* Occupied: show guest name + party size */}
      {table.currentTeam && (
        <div className="mt-1 max-w-[90%] flex items-center gap-1 text-[9px] text-charcoal leading-none font-semibold min-w-0">
          <span className="truncate">{table.currentTeam.name}</span>
          <span className="shrink-0">({table.currentTeam.partySize})</span>
        </div>
      )}

      {/* End time from linked reservation */}
      {table.currentTeam && linkedReservation && (
        <span className="text-[9px] text-occupied font-bold leading-none mt-0.5">
          ~{linkedReservation.endTime}
        </span>
      )}

      {/* Walk-in: show seatedAt time */}
      {table.currentTeam && !linkedReservation && (
        <span className="text-[8px] text-charcoal-lighter leading-none mt-0.5">
          {table.currentTeam.seatedAt}~
        </span>
      )}

      {/* nextBooking indicator */}
      {table.nextBooking && (
        <div
          className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-reserved rounded-full flex items-center justify-center shadow-sm ring-2 ring-surface"
          title={`다음: ${table.nextBooking.name} ${table.nextBooking.startTime}`}
        >
          <CalendarClock size={8} className="text-white" />
        </div>
      )}

      {isPlannedMergeTarget && !table.nextBooking && (
        <div
          className="absolute -top-1.5 -left-1.5 min-w-4 h-4 px-1 bg-reserved/90 rounded-full flex items-center justify-center shadow-sm ring-2 ring-surface"
          title={`병합 예정 범위 (${plannedMergeHost?.nextBooking?.targetLabel})`}
        >
          <span className="text-[8px] leading-none font-bold text-white">예</span>
        </div>
      )}
    </div>
  )
}
