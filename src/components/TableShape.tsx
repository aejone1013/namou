import { Users, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { TableInfo } from '@/data/dummy'
import { useReservationStore } from '@/store/useReservationStore'

interface TableShapeProps {
  table: TableInfo
}

const statusStyles = {
  available: {
    bg: 'bg-available-light',
    border: 'border-available/30',
    shadow: 'shadow-green-100',
  },
  occupied: {
    bg: 'bg-occupied-light',
    border: 'border-occupied/30',
    shadow: 'shadow-red-100',
  },
  reserved: {
    bg: 'bg-reserved-light',
    border: 'border-reserved/40',
    shadow: 'shadow-yellow-100',
  },
}

export default function TableShape({ table }: TableShapeProps) {
  const { reservations, focusedTableId, setFocusedTable } = useReservationStore()
  const isOpen = focusedTableId === table.id
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
        'shadow-md',
        style.bg,
        style.border,
        style.shadow,
        isOpen && 'ring-2 ring-primary/30 scale-[1.03]',
        'rounded-xl'
      )}
      style={{
        left: table.x,
        top: table.y,
        width: table.width,
        height: table.height,
        zIndex: isOpen ? 25 : 12,
      }}
    >
      {/* Label + seats */}
      <span className="text-[13px] font-bold text-charcoal leading-none">{table.label}</span>
      <div className="flex items-center gap-0.5 mt-0.5">
        <Users size={10} className="text-charcoal-lighter" />
        <span className="text-[10px] text-charcoal-light font-medium">{table.seats}</span>
      </div>

      {/* Occupied: show guest name + party size */}
      {table.currentTeam && (
        <span className="text-[9px] text-charcoal mt-1 max-w-[90%] truncate leading-none font-medium">
          {table.currentTeam.name} ({table.currentTeam.partySize})
        </span>
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
          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-reserved rounded-full flex items-center justify-center shadow-sm"
          title={`다음: ${table.nextBooking.name} ${table.nextBooking.startTime}`}
        >
          <CalendarClock size={8} className="text-white" />
        </div>
      )}
    </div>
  )
}
