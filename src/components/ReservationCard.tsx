import { useState } from 'react'
import { Users, MessageSquare, Phone, Trash2, Armchair, Pencil, Sun, Moon, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Reservation } from '@/data/dummy'
import { compareTableLabel } from '@/data/dummy'
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
  const { removeReservation, tables, seatReservation, openModal, clearTable } = useReservationStore()
  const config = statusConfig[reservation.status]
  const [showTableSelect, setShowTableSelect] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const seatedTable = tables.find((t) => t.currentTeam?.reservationId === reservation.id)

  const availableTables = [...tables.filter(
    (t) => t.status === 'available' && t.seats >= reservation.partySize
  )].sort((a, b) => compareTableLabel(a.label, b.label))

  const handleSeatAtTable = (tableId: string) => {
    seatReservation(reservation.id, tableId)
    setShowTableSelect(false)
  }

  const handleComplete = () => {
    if (seatedTable) {
      clearTable(seatedTable.id)
    }
  }

  return (
    <div
      className={cn(
        'bg-surface rounded-2xl p-3.5 border border-border',
        'hover:border-border-hover hover:shadow-md hover:shadow-primary/5',
        'transition-all duration-200',
        'group'
      )}
    >
      <div className="flex items-start justify-between mb-1.5">
        <h3 className="font-semibold text-charcoal text-sm">
          {reservation.name}
        </h3>
        <div className="flex items-center gap-1.5">
          {reservation.status === 'seated' && seatedTable && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
              {seatedTable.label}
            </span>
          )}
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
              config.bg, config.text
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
            {config.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-charcoal-light text-xs">
        <span className="inline-flex items-center gap-1">
          {reservation.period === 'lunch' ? (
            <Sun size={11} className="text-yellow-600" />
          ) : (
            <Moon size={11} className="text-indigo-400" />
          )}
          {reservation.startTime}~{reservation.endTime}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users size={12} className="text-charcoal-lighter" />
          {reservation.partySize}명
        </span>
      </div>

      {reservation.phone && (
        <div className="flex items-center gap-1.5 mt-1.5 text-charcoal-lighter text-[11px]">
          <Phone size={11} />
          {reservation.phone}
        </div>
      )}

      {reservation.note && (
        <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-primary-dark bg-primary/5 rounded-xl px-2.5 py-1.5">
          <MessageSquare size={11} className="mt-0.5 shrink-0" />
          {reservation.note}
        </div>
      )}

      {/* 테이블 선택 패널 */}
      {showTableSelect && (
        <div className="mt-2.5 pt-2.5 border-t border-border">
          <p className="text-[11px] text-charcoal-lighter mb-1.5">테이블 선택:</p>
          <div className="flex flex-wrap gap-1.5">
            {availableTables.map((t) => (
              <button key={t.id} onClick={() => handleSeatAtTable(t.id)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-cream hover:bg-primary/10 text-charcoal border border-border hover:border-primary/30 transition-colors"
              >
                {t.label} ({t.seats}석)
              </button>
            ))}
          </div>
          <button onClick={() => setShowTableSelect(false)} className="text-[10px] text-charcoal-lighter mt-1.5 hover:text-charcoal">취소</button>
        </div>
      )}

      {/* 삭제 확인 */}
      {showDeleteConfirm && (
        <div className="mt-2.5 pt-2.5 border-t border-border">
          <p className="text-[11px] text-charcoal mb-2">이 예약을 삭제하시겠습니까?</p>
          <div className="flex gap-2">
            <button
              onClick={() => { removeReservation(reservation.id); setShowDeleteConfirm(false) }}
              className="flex-1 text-[11px] font-medium py-1.5 rounded-xl text-white bg-occupied hover:bg-occupied/80 transition-colors"
            >삭제</button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 text-[11px] font-medium py-1.5 rounded-xl text-charcoal-light bg-cream hover:bg-border transition-colors"
            >취소</button>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      {!showTableSelect && !showDeleteConfirm && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border">
          {reservation.status === 'waiting' && availableTables.length > 0 && (
            <button
              onClick={() => setShowTableSelect(true)}
              className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors"
            >
              <Armchair size={12} />
              착석
            </button>
          )}
          {reservation.status === 'waiting' && availableTables.length === 0 && (
            <span className="flex-1 text-[11px] text-charcoal-lighter text-center py-1.5">빈 테이블 없음</span>
          )}

          {/* Seated: complete only */}
          {reservation.status === 'seated' && (
            <button
              onClick={handleComplete}
              className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-xl text-white bg-available hover:bg-available/80 transition-colors"
            >
              <CheckCircle size={12} />
              식사 완료
            </button>
          )}

          {reservation.status !== 'completed' && (
            <button
              onClick={() => openModal(reservation)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-xl text-charcoal-lighter hover:text-primary hover:bg-primary/10 transition-colors"
              title="편집"
            >
              <Pencil size={13} />
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-xl text-charcoal-lighter hover:text-occupied hover:bg-occupied-light transition-colors"
            title="삭제"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
