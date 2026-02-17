import { Clock, Users } from 'lucide-react'
import type { Reservation } from '@/data/dummy'

interface DragOverlayContentProps {
  reservation: Reservation
}

export default function DragOverlayContent({ reservation }: DragOverlayContentProps) {
  return (
    <div className="bg-surface rounded-2xl p-3 border-2 border-primary shadow-xl shadow-primary/20 w-[200px] rotate-3 opacity-90">
      <h3 className="font-semibold text-charcoal text-sm">{reservation.name}</h3>
      <div className="flex items-center gap-3 text-charcoal-light text-xs mt-1">
        <span className="inline-flex items-center gap-1">
          <Clock size={12} />
          {reservation.time}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users size={12} />
          {reservation.partySize}명
        </span>
      </div>
    </div>
  )
}
