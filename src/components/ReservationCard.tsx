import { Clock, Users, MessageSquare, Phone, Trash2, Armchair } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Reservation } from '@/data/dummy'
import { useReservationStore } from '@/store/useReservationStore'

interface ReservationCardProps {
  reservation: Reservation
}

const statusConfig = {
  waiting: {
    bg: 'bg-primary/10',
    text: 'text-primary-dark',
    label: '대기중',
    dot: 'bg-primary',
  },
  seated: {
    bg: 'bg-available-light',
    text: 'text-green-700',
    label: '착석',
    dot: 'bg-available',
  },
  completed: {
    bg: 'bg-charcoal-lighter/10',
    text: 'text-charcoal-lighter',
    label: '완료',
    dot: 'bg-charcoal-lighter',
  },
}

export default function ReservationCard({ reservation }: ReservationCardProps) {
  const { removeReservation, tables, seatReservation } = useReservationStore()
  const config = statusConfig[reservation.status]

  // 빈 테이블 중 인원수에 맞는 테이블 찾기
  const availableTables = tables.filter(
    (t) => t.status === 'available' && t.seats >= reservation.partySize
  )

  const handleQuickSeat = () => {
    if (availableTables.length > 0) {
      seatReservation(reservation.id, availableTables[0].id)
    }
  }

  return (
    <div
      className={cn(
        'bg-surface rounded-2xl p-4 border border-border',
        'hover:border-border-hover hover:shadow-md hover:shadow-primary/5',
        'transition-all duration-200',
        'group'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-charcoal text-[15px]">
          {reservation.name}
        </h3>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
            config.bg,
            config.text
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-charcoal-light text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} className="text-charcoal-lighter" />
          {reservation.time}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users size={14} className="text-charcoal-lighter" />
          {reservation.partySize}명
        </span>
      </div>

      {reservation.phone && (
        <div className="flex items-center gap-1.5 mt-2 text-charcoal-lighter text-xs">
          <Phone size={12} />
          {reservation.phone}
        </div>
      )}

      {reservation.note && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-primary-dark bg-primary/5 rounded-xl px-3 py-2">
          <MessageSquare size={12} className="mt-0.5 shrink-0" />
          {reservation.note}
        </div>
      )}

      {/* 액션 버튼 - 호버 시 표시 */}
      <div
        className={cn(
          'flex items-center gap-2 mt-3 pt-3 border-t border-border',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
        )}
      >
        {reservation.status === 'waiting' && availableTables.length > 0 && (
          <button
            onClick={handleQuickSeat}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5',
              'text-xs font-medium py-1.5 rounded-xl',
              'text-white bg-primary hover:bg-primary-dark',
              'transition-colors'
            )}
          >
            <Armchair size={13} />
            착석 ({availableTables[0].label})
          </button>
        )}
        {reservation.status === 'waiting' && availableTables.length === 0 && (
          <span className="flex-1 text-xs text-charcoal-lighter text-center py-1.5">
            빈 테이블 없음
          </span>
        )}
        <button
          onClick={() => removeReservation(reservation.id)}
          className={cn(
            'inline-flex items-center justify-center',
            'w-8 h-8 rounded-xl',
            'text-charcoal-lighter hover:text-occupied hover:bg-occupied-light',
            'transition-colors'
          )}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
