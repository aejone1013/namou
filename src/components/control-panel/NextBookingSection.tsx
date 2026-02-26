import { useMemo, useState } from 'react'
import { CalendarClock, Users, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { getMergeGroup, getMergeLabel, getTableNumber } from '@/data/dummy'
import type { Reservation, TableInfo } from '@/data/dummy'
import { useReservationStore } from '@/store/useReservationStore'

interface NextBookingSectionProps {
  table: TableInfo
  waitingReservations: Reservation[]
  showNextBookingSelect: boolean
  setShowNextBookingSelect: (v: boolean) => void
  onSetNextBooking: (tableId: string, reservationId: string) => void
  onClearNextBooking: (tableId: string) => void
  onSetTargetLabel: (tableId: string, label?: string) => void
}

export default function NextBookingSection({
  table,
  waitingReservations,
  showNextBookingSelect,
  setShowNextBookingSelect,
  onSetNextBooking,
  onClearNextBooking,
  onSetTargetLabel,
}: NextBookingSectionProps) {
  const store = useReservationStore()
  const [pendingMergeReservationId, setPendingMergeReservationId] = useState<string | null>(null)
  const effectiveTables = store.getEffectiveTables()
  const baseTableIds = useMemo(() => new Set(store.tables.map((t) => t.id)), [store.tables])
  const pendingMergeReservation = pendingMergeReservationId
    ? waitingReservations.find((r) => r.id === pendingMergeReservationId) ?? null
    : null

  const pendingMergeOptions = useMemo(() => {
    if (!pendingMergeReservation) return []
    if (pendingMergeReservation.partySize <= table.seats) return []
    if (!baseTableIds.has(table.id)) return []

    const baseNum = getTableNumber(table.label)
    const group = getMergeGroup(baseNum)
    const candidates = effectiveTables
      .filter((t) => t.id !== table.id)
      .filter((t) => baseTableIds.has(t.id))
      .filter((t) => t.status === 'available')
      .filter((t) => {
        const num = getTableNumber(t.label)
        return group ? group.includes(num) : true
      })
      .map((t) => ({ id: t.id, num: getTableNumber(t.label), seats: t.seats, label: t.label }))

    const byNum = new Map(candidates.map((c) => [c.num, c]))
    const reachableLeft: typeof candidates = []
    const reachableRight: typeof candidates = []
    let left = baseNum - 1
    while (byNum.has(left)) {
      reachableLeft.push(byNum.get(left)!)
      left--
    }
    let right = baseNum + 1
    while (byNum.has(right)) {
      reachableRight.push(byNum.get(right)!)
      right++
    }

    const results: Array<{ mergeLabel: string; totalSeats: number }> = []
    for (let lCount = 0; lCount <= reachableLeft.length; lCount++) {
      for (let rCount = 0; rCount <= reachableRight.length; rCount++) {
        if (lCount === 0 && rCount === 0) continue
        const selected = [...reachableLeft.slice(0, lCount), ...reachableRight.slice(0, rCount)]
        const totalSeats = table.seats + selected.reduce((sum, c) => sum + c.seats, 0)
        if (totalSeats < pendingMergeReservation.partySize) continue
        const nums = [baseNum, ...selected.map((c) => c.num)].sort((a, b) => a - b)
        results.push({
          mergeLabel: getMergeLabel(nums),
          totalSeats,
        })
      }
    }

    const deduped = results.filter((option, index, arr) =>
      arr.findIndex((other) => other.mergeLabel === option.mergeLabel) === index
    )
    deduped.sort((a, b) => {
      if (a.totalSeats !== b.totalSeats) return a.totalSeats - b.totalSeats
      return a.mergeLabel.localeCompare(b.mergeLabel, 'ko')
    })
    if (deduped.length === 0) return deduped
    const minSeats = deduped[0].totalSeats
    return deduped.filter((option) => option.totalSeats === minSeats)
  }, [pendingMergeReservation, table, effectiveTables, baseTableIds])

  const handleSelectNextBooking = (reservation: Reservation) => {
    if (reservation.partySize <= table.seats) {
      onSetNextBooking(table.id, reservation.id)
      setPendingMergeReservationId(null)
      setShowNextBookingSelect(false)
      return
    }
    setPendingMergeReservationId(reservation.id)
  }

  const handleAssignMergedNextBooking = (reservation: Reservation, mergeLabel: string) => {
    onSetNextBooking(table.id, reservation.id)
    onSetTargetLabel(table.id, mergeLabel)
    setPendingMergeReservationId(null)
    setShowNextBookingSelect(false)
  }

  if (table.status !== 'occupied') return null

  return (
    <div className="border-t border-border pt-2">
      {table.nextBooking ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-charcoal flex items-center gap-1">
              <CalendarClock size={11} className="text-reserved" />
              다음 예약
            </p>
            <button onClick={() => onClearNextBooking(table.id)} className="text-charcoal-lighter hover:text-occupied transition-colors">
              <X size={12} />
            </button>
          </div>
          <div className="text-[10px] bg-reserved/10 rounded-lg px-2 py-1.5 space-y-1">
            <p className="font-medium text-charcoal leading-tight">
              <span className="inline-block max-w-[118px] truncate align-bottom">{table.nextBooking.name}</span>
              <span className="text-charcoal-lighter ml-1">({table.nextBooking.partySize}명)</span>
            </p>
            <p className="text-charcoal-lighter leading-none">{table.nextBooking.startTime} ~ {table.nextBooking.endTime}</p>
            {table.nextBooking.targetLabel && (
              <div className="pt-0.5">
                {table.mergedFrom && table.mergedFrom.length >= 2 ? (
                  <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-md bg-surface/80 text-charcoal-light border border-border">
                    서브 {table.nextBooking.targetLabel}
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-md bg-reserved/10 text-reserved border border-reserved/20">
                    병합 예정 {table.nextBooking.targetLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          {table.mergedFrom && table.mergedFrom.length >= 2 && (
            <div className="space-y-1">
              <p className="text-[10px] text-charcoal-lighter">착석 위치:</p>
              <div className="flex flex-wrap gap-1">
                {table.mergedFrom.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => onSetTargetLabel(table.id, o.label)}
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-colors',
                      table.nextBooking?.targetLabel === o.label
                        ? 'bg-reserved text-white'
                        : 'bg-cream text-charcoal-light hover:bg-reserved/10'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
                <button
                  onClick={() => onSetTargetLabel(table.id, undefined)}
                  className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-colors',
                    !table.nextBooking?.targetLabel
                      ? 'bg-reserved text-white'
                      : 'bg-cream text-charcoal-light hover:bg-reserved/10'
                  )}
                >
                  전체
                </button>
              </div>
            </div>
          )}
        </div>
      ) : showNextBookingSelect ? (
        <div className="space-y-1.5">
          {!pendingMergeReservation ? (
            <>
              <p className="text-[11px] text-charcoal-lighter">예약 선택:</p>
              {waitingReservations.length > 0 ? (
                waitingReservations.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectNextBooking(r)}
                    className="w-full flex items-center justify-between text-[10px] px-2 py-1.5 rounded-lg bg-cream hover:bg-reserved/10 text-charcoal transition-colors gap-2"
                  >
                    <span className="font-medium truncate min-w-0 flex items-center gap-1">
                      <span className="truncate">{r.name}</span>
                      {r.partySize > table.seats && (
                        <span className="shrink-0 text-[9px] px-1 py-0.5 rounded-md bg-reserved/10 text-reserved">
                          병합
                        </span>
                      )}
                    </span>
                    <span className="text-charcoal-lighter flex items-center gap-1 shrink-0">
                      <Users size={10} />{r.partySize} · {r.startTime}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-[11px] text-charcoal-lighter">대기 중인 예약 없음</p>
              )}
            </>
          ) : (
            <div className="space-y-1.5 rounded-lg border border-reserved/20 bg-reserved/5 p-2">
              <p className="text-[10px] font-medium text-charcoal">
                {pendingMergeReservation.name}
                <span className="text-charcoal-lighter ml-1">({pendingMergeReservation.partySize}명)</span>
              </p>
              <p className="text-[10px] text-charcoal-lighter">병합될 테이블로 예약 배정:</p>
              {pendingMergeOptions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {pendingMergeOptions.map((option) => (
                    <button
                      key={option.mergeLabel}
                      onClick={() => handleAssignMergedNextBooking(pendingMergeReservation, option.mergeLabel)}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-cream hover:bg-reserved/10 text-charcoal border border-border transition-colors"
                    >
                      {option.mergeLabel}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-charcoal-lighter">현재는 병합 가능한 조합이 없습니다.</p>
              )}
              <button
                onClick={() => setPendingMergeReservationId(null)}
                className="text-[10px] text-charcoal-lighter hover:text-charcoal"
              >
                이전으로
              </button>
            </div>
          )}
          <button
            onClick={() => { setPendingMergeReservationId(null); setShowNextBookingSelect(false) }}
            className="text-[10px] text-charcoal-lighter hover:text-charcoal"
          >
            취소
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNextBookingSelect(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 rounded-xl text-reserved bg-reserved/10 hover:bg-reserved/20 transition-colors"
        >
          <CalendarClock size={12} />
          예약 걸어두기
        </button>
      )}
    </div>
  )
}
