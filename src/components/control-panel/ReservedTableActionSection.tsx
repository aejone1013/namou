import { Armchair, Clock } from 'lucide-react'
import type { Reservation, TableInfo } from '@/data/dummy'

interface ReservedTableActionSectionProps {
  table: TableInfo
  linkedReservation: Reservation | null
  onSeat: () => void
}

export default function ReservedTableActionSection({
  table,
  linkedReservation,
  onSeat,
}: ReservedTableActionSectionProps) {
  if (table.status !== 'reserved' || !linkedReservation) return null

  return (
    <div className="space-y-2">
      <div className="text-[11px] space-y-1">
        <p className="font-medium text-charcoal">
          {linkedReservation.name}
          <span className="text-charcoal-lighter ml-1">({linkedReservation.partySize}명)</span>
        </p>
        <div className="flex items-center gap-1 text-charcoal-lighter">
          <Clock size={11} />
          {linkedReservation.startTime} ~ {linkedReservation.endTime}
        </div>
      </div>
      <button
        onClick={onSeat}
        className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-medium py-2 rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors"
      >
        <Armchair size={13} />
        착석 처리
      </button>
    </div>
  )
}
