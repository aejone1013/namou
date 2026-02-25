import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/cn'
import type { Reservation } from '@/data/dummy'
import ReservationCard from './ReservationCard'

interface DraggableReservationCardProps {
  reservation: Reservation
}

export default function DraggableReservationCard({
  reservation,
}: DraggableReservationCardProps) {
  const isDraggable = reservation.status === 'waiting'

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `reservation-${reservation.id}`,
      data: { reservation },
      disabled: !isDraggable,
    })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      className={cn(
        isDragging && 'opacity-80 shadow-xl shadow-primary/20 rotate-2 scale-105',
        isDraggable && 'cursor-grab active:cursor-grabbing',
        'transition-shadow'
      )}
    >
      <ReservationCard reservation={reservation} />
    </div>
  )
}
