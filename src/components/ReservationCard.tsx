import { useState } from 'react'
import { Clock, Users, MessageSquare, Phone, Trash2, Armchair, Pencil } from 'lucide-react'
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
  const { removeReservation, tables, seatReservation, openModal } = useReservationStore()
  const config = statusConfig[reservation.status]
  const [showTableSelect, setShowTableSelect] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 빈 테이블 중 인원수에 맞는 테이블 찾기
  const availableTables = tables.filter(
    (t) => t.status === 'available' && t.seats >= reservation.partySize
  )

  const handleSeatAtTable = (tableId: string) => {
    seatReservation(reservation.id, tableId)
    setShowTableSelect(false)
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
          {reservation.startTime} ~ {reservation.endTime}
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

      {/* 테이블 선택 패널 */}
      {showTableSelect && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[11px] text-charcoal-lighter mb-2">테이블 선택:</p>
          <div className="flex flex-wrap gap-1.5">
            {availableTables.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSeatAtTable(t.id)}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-lg',
                  'bg-cream hover:bg-primary/10 text-charcoal',
                  'border border-border hover:border-primary/30',
                  'transition-colors'
                )}
              >
                {t.label} ({t.seats}석)
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTableSelect(false)}
            className="text-[11px] text-charcoal-lighter mt-2 hover:text-charcoal"
          >
            취소
          </button>
        </div>
      )}

      {/* 삭제 확인 */}
      {showDeleteConfirm && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-charcoal mb-2">이 예약을 삭제하시겠습니까?</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                removeReservation(reservation.id)
                setShowDeleteConfirm(false)
              }}
              className={cn(
                'flex-1 text-xs font-medium py-1.5 rounded-xl',
                'text-white bg-occupied hover:bg-occupied/80',
                'transition-colors'
              )}
            >
              삭제
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className={cn(
                'flex-1 text-xs font-medium py-1.5 rounded-xl',
                'text-charcoal-light bg-cream hover:bg-border',
                'transition-colors'
              )}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      {!showTableSelect && !showDeleteConfirm && (
        <div
          className={cn(
            'flex items-center gap-2 mt-3 pt-3 border-t border-border',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
          )}
        >
          {reservation.status === 'waiting' && availableTables.length > 0 && (
            <button
              onClick={() => setShowTableSelect(true)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1.5',
                'text-xs font-medium py-1.5 rounded-xl',
                'text-white bg-primary hover:bg-primary-dark',
                'transition-colors'
              )}
            >
              <Armchair size={13} />
              착석
            </button>
          )}
          {reservation.status === 'waiting' && availableTables.length === 0 && (
            <span className="flex-1 text-xs text-charcoal-lighter text-center py-1.5">
              빈 테이블 없음
            </span>
          )}
          {reservation.status !== 'completed' && (
            <button
              onClick={() => openModal(reservation)}
              className={cn(
                'inline-flex items-center justify-center',
                'w-8 h-8 rounded-xl',
                'text-charcoal-lighter hover:text-primary hover:bg-primary/10',
                'transition-colors'
              )}
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
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
      )}
    </div>
  )
}
