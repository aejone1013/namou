import { useEffect, useRef, useState } from 'react'
import { Users, Clock, XCircle, Armchair, Info, UserPlus, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { TableInfo } from '@/data/dummy'
import { useReservationStore } from '@/store/useReservationStore'

interface TablePopoverProps {
  table: TableInfo
  onClose: () => void
}

export default function TablePopover({ table, onClose }: TablePopoverProps) {
  const { clearTable, reservations, seatReservation, walkInTable } = useReservationStore()
  const ref = useRef<HTMLDivElement>(null)
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [walkInSize, setWalkInSize] = useState(2)
  const [walkInName, setWalkInName] = useState('')

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handler)
    })
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const linkedReservation = table.reservationId
    ? reservations.find((r) => r.id === table.reservationId)
    : null

  const waitingReservations = reservations.filter(
    (r) => r.status === 'waiting' && r.partySize <= table.seats
  )

  const popoverLeft = table.x + table.width + 12
  const popoverTop = table.y

  const handleWalkIn = () => {
    walkInTable(table.id, walkInSize, walkInName.trim() || undefined)
    onClose()
  }

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-30 w-[210px]',
        'bg-surface rounded-2xl border border-border',
        'shadow-xl shadow-charcoal/10',
        'overflow-hidden'
      )}
      style={{ left: popoverLeft, top: popoverTop }}
    >
      {/* 헤더 */}
      <div className="px-4 py-3 bg-cream/60 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-charcoal">{table.label}</span>
          <div className="flex items-center gap-1 text-xs text-charcoal-lighter">
            <Users size={12} />
            {table.seats}인석
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* 상태: 사용중 */}
        {table.status === 'occupied' && linkedReservation && (
          <>
            <div className="text-xs space-y-1">
              <p className="font-medium text-charcoal">
                {linkedReservation.name}
                <span className="text-charcoal-lighter ml-1">
                  ({linkedReservation.partySize}명)
                </span>
              </p>
              <div className="flex items-center gap-1 text-charcoal-lighter">
                <Clock size={11} />
                {linkedReservation.startTime} ~ {linkedReservation.endTime}
              </div>
            </div>
            <button
              onClick={() => {
                clearTable(table.id)
                onClose()
              }}
              className={cn(
                'w-full inline-flex items-center justify-center gap-1.5',
                'text-xs font-medium py-2 rounded-xl',
                'text-occupied bg-occupied-light hover:bg-occupied/20',
                'transition-colors'
              )}
            >
              <XCircle size={13} />
              테이블 비우기
            </button>
          </>
        )}

        {/* 상태: 사용중이지만 예약 연결 없음 (워크인) */}
        {table.status === 'occupied' && !linkedReservation && (
          <>
            <div className="text-xs text-charcoal-lighter py-1">
              {table.reservation || '사용중 (직접 배정)'}
            </div>
            <button
              onClick={() => {
                clearTable(table.id)
                onClose()
              }}
              className={cn(
                'w-full inline-flex items-center justify-center gap-1.5',
                'text-xs font-medium py-2 rounded-xl',
                'text-occupied bg-occupied-light hover:bg-occupied/20',
                'transition-colors'
              )}
            >
              <XCircle size={13} />
              테이블 비우기
            </button>
          </>
        )}

        {/* 상태: 비어있음 */}
        {table.status === 'available' && (
          <>
            {/* 워크인(새 팀) 배정 */}
            {!showWalkIn ? (
              <button
                onClick={() => setShowWalkIn(true)}
                className={cn(
                  'w-full inline-flex items-center justify-center gap-1.5',
                  'text-xs font-medium py-2 rounded-xl',
                  'text-white bg-primary hover:bg-primary-dark',
                  'transition-colors'
                )}
              >
                <UserPlus size={13} />
                새 팀 배정
              </button>
            ) : (
              <div className="space-y-2 bg-cream rounded-xl p-2.5">
                <p className="text-[11px] font-medium text-charcoal">새 팀 배정</p>
                {/* 이름 입력 */}
                <input
                  type="text"
                  placeholder="이름 (선택)"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className={cn(
                    'w-full text-xs px-2.5 py-1.5 rounded-lg',
                    'bg-surface border border-border',
                    'text-charcoal placeholder:text-charcoal-lighter',
                    'focus:outline-none focus:border-primary/50'
                  )}
                />
                {/* 인원수 */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-charcoal-light">인원</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWalkInSize(Math.max(1, walkInSize - 1))}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface border border-border text-charcoal-light hover:border-primary/50 transition-colors"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="text-xs font-bold text-charcoal w-5 text-center">{walkInSize}</span>
                    <button
                      onClick={() => setWalkInSize(Math.min(table.seats, walkInSize + 1))}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface border border-border text-charcoal-light hover:border-primary/50 transition-colors"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
                {/* 버튼 */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setShowWalkIn(false)}
                    className="flex-1 text-[11px] font-medium py-1.5 rounded-lg bg-surface border border-border text-charcoal-light hover:bg-border transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleWalkIn}
                    className="flex-1 text-[11px] font-medium py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
                  >
                    배정
                  </button>
                </div>
              </div>
            )}

            {/* 대기 예약 배정 */}
            {waitingReservations.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-charcoal-lighter">예약 배정:</p>
                {waitingReservations.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      seatReservation(r.id, table.id)
                      onClose()
                    }}
                    className={cn(
                      'w-full flex items-center justify-between',
                      'text-xs px-3 py-2 rounded-xl',
                      'bg-cream hover:bg-primary/10 text-charcoal',
                      'transition-colors'
                    )}
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-charcoal-lighter flex items-center gap-1">
                      <Users size={11} />{r.partySize}명
                    </span>
                  </button>
                ))}
              </div>
            )}

            {waitingReservations.length === 0 && !showWalkIn && (
              <div className="flex items-center gap-1.5 text-xs text-charcoal-lighter py-1">
                <Info size={12} />
                대기 중인 예약이 없습니다
              </div>
            )}
          </>
        )}

        {/* 상태: 예약됨 */}
        {table.status === 'reserved' && linkedReservation && (
          <>
            <div className="text-xs space-y-1">
              <p className="font-medium text-charcoal">
                {linkedReservation.name}
                <span className="text-charcoal-lighter ml-1">
                  ({linkedReservation.partySize}명)
                </span>
              </p>
              <div className="flex items-center gap-1 text-charcoal-lighter">
                <Clock size={11} />
                {linkedReservation.startTime} ~ {linkedReservation.endTime}
              </div>
            </div>
            <button
              onClick={() => {
                seatReservation(linkedReservation.id, table.id)
                onClose()
              }}
              className={cn(
                'w-full inline-flex items-center justify-center gap-1.5',
                'text-xs font-medium py-2 rounded-xl',
                'text-white bg-primary hover:bg-primary-dark',
                'transition-colors'
              )}
            >
              <Armchair size={13} />
              착석 처리
            </button>
          </>
        )}
      </div>
    </div>
  )
}
