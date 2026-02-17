import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
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
      className={cn(
        isDragging && 'opacity-80 shadow-xl shadow-primary/20 rotate-2 scale-105',
        'transition-shadow'
      )}
    >
      {/* 드래그 핸들 - 대기중인 예약만 */}
      {isDraggable && (
        <div
          {...listeners}
          {...attributes}
          className={cn(
            'flex items-center justify-center gap-1',
            'text-[10px] text-charcoal-lighter font-medium',
            'py-1 mb-1 rounded-t-xl cursor-grab active:cursor-grabbing',
            'hover:text-primary hover:bg-primary/5 transition-colors',
            'select-none'
          )}
        >
          <GripVertical size={12} />
          드래그하여 테이블에 배정
        </div>
      )}
      <ReservationCard reservation={reservation} />
    </div>
  )
}
