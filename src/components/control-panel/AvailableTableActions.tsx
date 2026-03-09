import { useState } from 'react'
import { Info, Minus, Plus, UserPlus, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Reservation, TableInfo } from '@/data/dummy'
import { getTableNumber, isContiguousRange } from '@/data/dummy'

interface AvailableTableActionsProps {
  table: TableInfo
  showWalkIn: boolean
  setShowWalkIn: (v: boolean) => void
  walkInName: string
  setWalkInName: (v: string) => void
  walkInSize: number
  setWalkInSize: (v: number) => void
  walkInStartTime: string
  setWalkInStartTime: (v: string) => void
  walkInEndTime: string
  setWalkInEndTime: (v: string) => void
  waitingReservations: Reservation[]
  hideEmptyWaitingMessage?: boolean
  onSeatReservation: (reservationId: string) => void
  onWalkIn: () => void
  walkInMergeCandidates: TableInfo[]
  onSubmitWalkInMerge: (selectedIds: string[]) => void
}

export default function AvailableTableActions({
  table,
  showWalkIn,
  setShowWalkIn,
  walkInName,
  setWalkInName,
  walkInSize,
  setWalkInSize,
  walkInStartTime,
  setWalkInStartTime,
  walkInEndTime,
  setWalkInEndTime,
  waitingReservations,
  hideEmptyWaitingMessage = false,
  onSeatReservation,
  onWalkIn,
  walkInMergeCandidates,
  onSubmitWalkInMerge,
}: AvailableTableActionsProps) {
  const [showWalkInMergeSelect, setShowWalkInMergeSelect] = useState(false)
  const [selectedWalkInMergeTableIds, setSelectedWalkInMergeTableIds] = useState<string[]>([])
  const [forceWalkInMerge, setForceWalkInMerge] = useState(false)

  const selectedWalkInMergeTables = walkInMergeCandidates.filter((t) => selectedWalkInMergeTableIds.includes(t.id))
  const selectedWalkInTotalSeats = table.seats + selectedWalkInMergeTables.reduce((sum, t) => sum + t.seats, 0)
  const selectedWalkInNums = [getTableNumber(table.label), ...selectedWalkInMergeTables.map((t) => getTableNumber(t.label))]
  const isContiguousWalkInSelection = selectedWalkInNums.length > 0 ? isContiguousRange(selectedWalkInNums) : false
  const canSubmitWalkInMerge =
    selectedWalkInMergeTableIds.length > 0 &&
    selectedWalkInTotalSeats >= walkInSize &&
    isContiguousWalkInSelection

  const resetMergeState = () => {
    setShowWalkInMergeSelect(false)
    setSelectedWalkInMergeTableIds([])
    setForceWalkInMerge(false)
  }

  if (table.status !== 'available') return null

  return (
    <div className="space-y-2">
      {!showWalkIn ? (
        <button
          onClick={() => setShowWalkIn(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-medium py-2 rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors"
        >
          <UserPlus size={13} />
          워크인 배정
        </button>
      ) : (
        <div className="space-y-2 bg-cream rounded-xl p-2.5">
          <p className="text-[12px] font-medium text-charcoal">워크인 배정</p>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <input
              type="text"
              placeholder="이름 (선택)"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              className="w-full text-[12px] px-2 py-1.5 rounded-lg bg-surface border border-border text-charcoal placeholder:text-charcoal-lighter focus:outline-none focus:border-primary/50"
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setWalkInSize(Math.max(1, walkInSize - 1))}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-surface border border-border text-charcoal-light hover:border-primary/50 transition-colors"
              >
                <Minus size={10} />
              </button>
              <span className="text-[12px] font-bold text-charcoal w-5 text-center">{walkInSize}</span>
              <button
                onClick={() => setWalkInSize(Math.min(14, walkInSize + 1))}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-surface border border-border text-charcoal-light hover:border-primary/50 transition-colors"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-charcoal-lighter">
              시작
              <input
                type="time"
                step={900}
                value={walkInStartTime}
                onChange={(e) => setWalkInStartTime(e.target.value)}
                className="mt-1 w-full text-[12px] px-2 py-1.5 rounded-lg bg-surface border border-border text-charcoal focus:outline-none focus:border-primary/50"
              />
            </label>
            <label className="text-[12px] text-charcoal-lighter">
              종료
              <input
                type="time"
                step={900}
                value={walkInEndTime}
                onChange={(e) => setWalkInEndTime(e.target.value)}
                className="mt-1 w-full text-[12px] px-2 py-1.5 rounded-lg bg-surface border border-border text-charcoal focus:outline-none focus:border-primary/50"
              />
            </label>
          </div>

          {/* 강제 병합 토글 */}
          {walkInMergeCandidates.length > 0 && (
            <label className="flex items-center gap-1.5 text-[12px] text-charcoal-light cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceWalkInMerge}
                onChange={(e) => {
                  setForceWalkInMerge(e.target.checked)
                  if (e.target.checked) {
                    setShowWalkInMergeSelect(true)
                  } else {
                    setShowWalkInMergeSelect(false)
                    setSelectedWalkInMergeTableIds([])
                  }
                }}
                className="rounded"
              />
              테이블 병합
            </label>
          )}

          {/* 병합 UI */}
          {(showWalkInMergeSelect) && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-2.5 py-2 space-y-2">
              <p className="text-[12px] font-medium text-charcoal">
                {walkInSize}명 병합 배정
              </p>
              <p className="text-[12px] text-charcoal-lighter">
                병합할 테이블을 선택하세요. (기준: {table.label} {table.seats}석)
              </p>
              {walkInMergeCandidates.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {walkInMergeCandidates.map((candidate) => {
                    const active = selectedWalkInMergeTableIds.includes(candidate.id)
                    return (
                      <button
                        key={candidate.id}
                        onClick={() =>
                          setSelectedWalkInMergeTableIds((prev) =>
                            prev.includes(candidate.id)
                              ? prev.filter((id) => id !== candidate.id)
                              : [...prev, candidate.id]
                          )
                        }
                        className={cn(
                          'text-[12px] font-medium px-1.5 py-0.5 rounded-md border transition-colors',
                          active
                            ? 'bg-primary text-white border-primary'
                            : 'bg-cream text-charcoal border-border hover:border-primary/40 hover:bg-primary/10'
                        )}
                      >
                        {candidate.label} · {candidate.seats}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-charcoal-lighter">병합 가능한 인접 테이블이 없습니다.</p>
              )}
              <p className={cn(
                'text-[12px]',
                canSubmitWalkInMerge ? 'text-available' : 'text-charcoal-lighter'
              )}>
                선택 좌석: {selectedWalkInTotalSeats} / 필요 좌석: {walkInSize}
              </p>
              {selectedWalkInMergeTableIds.length > 0 && !isContiguousWalkInSelection && (
                <p className="text-[12px] text-occupied">연속된 테이블만 함께 병합할 수 있습니다.</p>
              )}
              <button
                onClick={() => {
                  onSubmitWalkInMerge(selectedWalkInMergeTableIds)
                  resetMergeState()
                }}
                disabled={!canSubmitWalkInMerge}
                className="w-full text-[12px] font-medium py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                선택 병합으로 배정
              </button>
            </div>
          )}

          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setShowWalkIn(false)
                resetMergeState()
              }}
              className="flex-1 text-[12px] font-medium py-1.5 rounded-lg bg-surface border border-border text-charcoal-light hover:bg-border transition-colors"
            >
              취소
            </button>
            {!showWalkInMergeSelect && (
              <button
                onClick={() => {
                  if (walkInSize > table.seats) {
                    setShowWalkInMergeSelect(true)
                    return
                  }
                  onWalkIn()
                }}
                className="flex-1 text-[12px] font-medium py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                배정
              </button>
            )}
          </div>
        </div>
      )}

      {waitingReservations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[12px] text-charcoal-lighter">예약 배정:</p>
          {waitingReservations.slice(0, 3).map((r) => (
            <button
              key={r.id}
              onClick={() => onSeatReservation(r.id)}
              className="w-full flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded-xl bg-cream hover:bg-primary/10 text-charcoal transition-colors gap-2"
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
        <div className="flex items-center gap-1.5 text-[12px] text-charcoal-lighter py-1">
          <Info size={12} />
          대기 중인 예약이 없습니다
        </div>
      )}
    </div>
  )
}
