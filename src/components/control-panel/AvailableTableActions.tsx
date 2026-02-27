import { Info, Minus, Plus, UserPlus, Users } from 'lucide-react'
import type { Reservation, TableInfo } from '@/data/dummy'

interface AvailableTableActionsProps {
  table: TableInfo
  showWalkIn: boolean
  setShowWalkIn: (v: boolean) => void
  walkInName: string
  setWalkInName: (v: string) => void
  walkInSize: number
  setWalkInSize: (v: number) => void
  waitingReservations: Reservation[]
  hideEmptyWaitingMessage?: boolean
  onSeatReservation: (reservationId: string) => void
  onWalkIn: () => void
}

export default function AvailableTableActions({
  table,
  showWalkIn,
  setShowWalkIn,
  walkInName,
  setWalkInName,
  walkInSize,
  setWalkInSize,
  waitingReservations,
  hideEmptyWaitingMessage = false,
  onSeatReservation,
  onWalkIn,
}: AvailableTableActionsProps) {
  if (table.status !== 'available') return null

  return (
    <div className="space-y-2">
      {!showWalkIn ? (
        <button
          onClick={() => setShowWalkIn(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-medium py-2 rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors"
        >
          <UserPlus size={13} />
          워크인 배정
        </button>
      ) : (
        <div className="space-y-2 bg-cream rounded-xl p-2.5">
          <p className="text-[11px] font-medium text-charcoal">워크인 배정</p>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <input
              type="text"
              placeholder="이름 (선택)"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              className="w-full text-[11px] px-2 py-1.5 rounded-lg bg-surface border border-border text-charcoal placeholder:text-charcoal-lighter focus:outline-none focus:border-primary/50"
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setWalkInSize(Math.max(1, walkInSize - 1))}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-surface border border-border text-charcoal-light hover:border-primary/50 transition-colors"
              >
                <Minus size={10} />
              </button>
              <span className="text-[11px] font-bold text-charcoal w-5 text-center">{walkInSize}</span>
              <button
                onClick={() => setWalkInSize(Math.min(table.seats, walkInSize + 1))}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-surface border border-border text-charcoal-light hover:border-primary/50 transition-colors"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setShowWalkIn(false)} className="flex-1 text-[10px] font-medium py-1.5 rounded-lg bg-surface border border-border text-charcoal-light hover:bg-border transition-colors">
              취소
            </button>
            <button onClick={onWalkIn} className="flex-1 text-[10px] font-medium py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors">
              배정
            </button>
          </div>
        </div>
      )}

      {waitingReservations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-charcoal-lighter">예약 배정:</p>
          {waitingReservations.slice(0, 3).map((r) => (
            <button
              key={r.id}
              onClick={() => onSeatReservation(r.id)}
              className="w-full flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-xl bg-cream hover:bg-primary/10 text-charcoal transition-colors gap-2"
            >
              <span className="font-medium truncate min-w-0 flex items-center gap-1">
                <span className="truncate">{r.name}</span>
                {r.partySize > table.seats && (
                  <span className="shrink-0 text-[9px] px-1 py-0.5 rounded-md bg-primary/10 text-primary">
                    병합 필요
                  </span>
                )}
              </span>
              <span className="text-charcoal-lighter flex items-center gap-1 shrink-0">
                <Users size={11} />{r.partySize}명
              </span>
            </button>
          ))}
        </div>
      )}

      {waitingReservations.length === 0 && !showWalkIn && !hideEmptyWaitingMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-charcoal-lighter py-1">
          <Info size={12} />
          대기 중인 예약이 없습니다
        </div>
      )}
    </div>
  )
}
