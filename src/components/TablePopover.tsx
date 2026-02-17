import { useEffect, useRef } from 'react'
import { Users, Clock, XCircle, Armchair, Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { TableInfo } from '@/data/dummy'
import { useReservationStore } from '@/store/useReservationStore'

interface TablePopoverProps {
  table: TableInfo
  onClose: () => void
}

export default function TablePopover({ table, onClose }: TablePopoverProps) {
  const { clearTable, reservations, seatReservation } = useReservationStore()
  const ref = useRef<HTMLDivElement>(null)

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // 다음 프레임에 리스너 등록 (현재 클릭 이벤트와 충돌 방지)
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handler)
    })
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const linkedReservation = table.reservationId
    ? reservations.find((r) => r.id === table.reservationId)
    : null

  // 대기 중인 예약 중 이 테이블에 앉을 수 있는 것들
  const waitingReservations = reservations.filter(
    (r) => r.status === 'waiting' && r.partySize <= table.seats
  )

  // 팝오버 위치 계산 (테이블 우측에 표시)
  const popoverLeft = table.x + table.width + 12
  const popoverTop = table.y

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-30 w-[200px]',
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
                {linkedReservation.time}
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

        {/* 상태: 비어있음 */}
        {table.status === 'available' && (
          <>
            {waitingReservations.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] text-charcoal-lighter">배정 가능한 예약:</p>
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
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-charcoal-lighter py-2">
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
                {linkedReservation.time}
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
