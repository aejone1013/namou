import { Users, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { TableInfo } from '@/data/dummy'
import { absoluteRectStyle } from '@/features/floor-map/floorMapStyles'
import { useReservationStore } from '@/store/useReservationStore'
import { bookingScopesOverlap } from '@/store/plannedBookingPolicies'

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
  const { reservations, focusedTableId, mergePreviewTableIds, setFocusedTable, sessionData, activeSession } = useReservationStore()
  const isOpen = focusedTableId === table.id
  const isMergePreview = mergePreviewTableIds.includes(table.id)
  const sessionTableStates = sessionData[activeSession].tableStates
  const tableScopeIds =
    table.mergedFrom && table.mergedFrom.length >= 2
      ? table.mergedFrom.map((o) => o.id)
      : [table.id]
  const plannedBookings = Object.entries(sessionTableStates)
    .flatMap(([stateTableId, ts]) => {
      const planned = ts?.plannedBookings ?? (ts?.nextBooking ? [ts.nextBooking] : [])
      return planned.filter((booking) => {
        const bookingScope = booking.scopeTableIds && booking.scopeTableIds.length > 0
          ? booking.scopeTableIds
          : [stateTableId]
        return bookingScopesOverlap(bookingScope, tableScopeIds)
      })
    })
    .filter((booking, idx, arr) =>
    arr.findIndex((b) =>
      b.reservationId === booking.reservationId &&
      b.startTime === booking.startTime &&
      b.endTime === booking.endTime &&
      (b.targetLabel ?? '') === (booking.targetLabel ?? '')
    ) === idx
  )
  const plannedBookingCount = plannedBookings.length
  const hasMergeScopedPlannedBooking = plannedBookings.some(
    (booking) =>
      (booking.scopeTableIds?.length ?? 0) >= 2 ||
      (!!booking.targetLabel && /[+\-~]/.test(booking.targetLabel))
  )
  const isScopedMultiBooking = (table.nextBooking?.scopeTableIds?.length ?? 0) >= 2
  const showSimpleNextBookingDot = !!table.nextBooking && !isScopedMultiBooking && !(table.nextBooking.targetLabel && /[+\-~]/.test(table.nextBooking.targetLabel))
  const simpleNextBooking = showSimpleNextBookingDot ? table.nextBooking : null
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
        <span className="text-[12px] text-charcoal-light font-medium">{table.seats}</span>
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

      {/* Walk-in: show end time */}
      {table.currentTeam && !linkedReservation && (
        <span className="text-[9px] text-occupied font-bold leading-none mt-0.5">
          {table.currentTeam.endTime
            ? `~${table.currentTeam.endTime}`
            : `${table.currentTeam.seatedAt}~`}
        </span>
      )}

      {(((table.mergedFrom?.length ?? 0) >= 2) || !hasMergeScopedPlannedBooking) && (simpleNextBooking || plannedBookingCount > 0) && (
        <div
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-reserved text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm"
          title={
            plannedBookingCount > 1
              ? `예약 배정 ${plannedBookingCount}건`
              : simpleNextBooking
                ? `다음: ${simpleNextBooking.name} ${simpleNextBooking.startTime}`
                : '다음 예약'
          }
        >
          {plannedBookingCount > 1 ? plannedBookingCount : <CalendarClock size={8} className="text-white" />}
        </div>
      )}

      {/* 병합 예정 배지는 범위 테두리(FloorMap) 우상단에 표시 */}
    </div>
  )
}
