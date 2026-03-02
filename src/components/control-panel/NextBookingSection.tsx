import { useMemo, useState } from 'react'
import { CalendarClock, Users, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { getMergeLabel, getTableNumber } from '@/data/dummy'
import type { Reservation, TableInfo } from '@/data/dummy'
import { useReservationStore } from '@/store/useReservationStore'
import { bookingConflictsOnSameTable, bookingScopesOverlap } from '@/store/plannedBookingPolicies'
import { useToastStore } from '@/store/useToastStore'

interface NextBookingSectionProps {
  table: TableInfo
  waitingReservations: Reservation[]
  showNextBookingSelect: boolean
  setShowNextBookingSelect: (v: boolean) => void
  onSetNextBooking: (tableId: string, reservationId: string) => void
  onSetNextBookingMulti: (tableIds: string[], reservationId: string, targetLabel?: string) => void
  onClearNextBooking: (tableId: string) => void
  onSetTargetLabel: (tableId: string, label?: string) => void
  mirroredNextBookingSource?: { tableId: string; tableLabel: string; nextBooking: NonNullable<TableInfo['nextBooking']> } | null
  canSeatDisplayedNextBooking?: boolean
  onSeatDisplayedNextBooking?: () => void
}

export default function NextBookingSection({
  table,
  waitingReservations,
  showNextBookingSelect,
  setShowNextBookingSelect,
  onSetNextBooking,
  onSetNextBookingMulti,
  onClearNextBooking,
  onSetTargetLabel,
  mirroredNextBookingSource = null,
  canSeatDisplayedNextBooking = false,
  onSeatDisplayedNextBooking,
}: NextBookingSectionProps) {
  const store = useReservationStore()
  const toast = useToastStore()
  const [pendingMergeReservationId, setPendingMergeReservationId] = useState<string | null>(null)
  const effectiveTables = store.getEffectiveTables()
  const isSameColumn = (a: { x: number }, b: { x: number }) => Math.abs(a.x - b.x) <= 42
  const activeSession = store.activeSession
  const sessionTableStates = store.sessionData[activeSession].tableStates
  const baseTableIds = useMemo(() => new Set(store.tables.map((t) => t.id)), [store.tables])
  const pendingMergeReservation = pendingMergeReservationId
    ? waitingReservations.find((r) => r.id === pendingMergeReservationId) ?? null
    : null
  const tableLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of store.tables) map.set(t.id, t.label)
    for (const t of effectiveTables) map.set(t.id, t.label)
    return map
  }, [store.tables, effectiveTables])

  const pendingMergeOptions = useMemo(() => {
    if (!pendingMergeReservation) return []
    const getScopeConflict = (scopeTableIds: string[]) => {
      for (const tableId of scopeTableIds) {
        const planned = sessionTableStates[tableId]?.plannedBookings ?? (sessionTableStates[tableId]?.nextBooking ? [sessionTableStates[tableId]!.nextBooking!] : [])
        const conflict = planned.find((b) =>
          bookingConflictsOnSameTable(
            b,
            { startTime: pendingMergeReservation.startTime, endTime: pendingMergeReservation.endTime },
            pendingMergeReservation.id
          )
        )
        if (conflict) return conflict
      }
      return null
    }

    // Occupied merged table: offer contiguous scope options on origin tables
    if (table.status === 'occupied' && table.mergedFrom && table.mergedFrom.length >= 2) {
      const origins = [...table.mergedFrom].sort((a, b) => getTableNumber(a.label) - getTableNumber(b.label))
      const options: Array<{ mergeLabel: string; totalSeats: number; scopeTableIds: string[] }> = []

      for (let start = 0; start < origins.length; start++) {
        let seats = 0
        const ids: string[] = []
        const nums: number[] = []
        for (let end = start; end < origins.length; end++) {
          const origin = origins[end]
          const planned = sessionTableStates[origin.id]?.plannedBookings ?? (sessionTableStates[origin.id]?.nextBooking ? [sessionTableStates[origin.id].nextBooking!] : [])
          const conflicts = planned.some((b) =>
            bookingConflictsOnSameTable(
              b,
              { startTime: pendingMergeReservation.startTime, endTime: pendingMergeReservation.endTime },
              pendingMergeReservation.id
            )
          )
          if (conflicts) break

          ids.push(origin.id)
          nums.push(getTableNumber(origin.label))
          seats += origin.seats

          if (seats >= pendingMergeReservation.partySize) {
            const scopeTableIds = [...ids]
            if (getScopeConflict(scopeTableIds)) break
            options.push({
              mergeLabel: getMergeLabel(nums),
              totalSeats: seats,
              scopeTableIds,
            })
            break
          }
        }
      }

      const deduped = options.filter((option, index, arr) =>
        arr.findIndex((other) => other.mergeLabel === option.mergeLabel) === index
      )
      deduped.sort((a, b) => {
        if (a.totalSeats !== b.totalSeats) return a.totalSeats - b.totalSeats
        if (a.scopeTableIds.length !== b.scopeTableIds.length) return a.scopeTableIds.length - b.scopeTableIds.length
        return a.mergeLabel.localeCompare(b.mergeLabel, 'ko')
      })
      if (deduped.length === 0) return deduped
      const minSeats = deduped[0].totalSeats
      const minCount = Math.min(...deduped.filter((o) => o.totalSeats === minSeats).map((o) => o.scopeTableIds.length))
      return deduped.filter((o) => o.totalSeats === minSeats && o.scopeTableIds.length === minCount)
    }

    if (pendingMergeReservation.partySize <= table.seats) return []
    if (!baseTableIds.has(table.id)) return []

    const baseNum = getTableNumber(table.label)
    const candidates = effectiveTables
      .filter((t) => t.id !== table.id)
      .filter((t) => baseTableIds.has(t.id))
      .filter((t) => t.status === 'available')
      .filter((t) => isSameColumn(t, table))
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

    const results: Array<{ mergeLabel: string; totalSeats: number; scopeTableIds: string[] }> = []
    for (let lCount = 0; lCount <= reachableLeft.length; lCount++) {
      for (let rCount = 0; rCount <= reachableRight.length; rCount++) {
        if (lCount === 0 && rCount === 0) continue
        const selected = [...reachableLeft.slice(0, lCount), ...reachableRight.slice(0, rCount)]
        const totalSeats = table.seats + selected.reduce((sum, c) => sum + c.seats, 0)
        if (totalSeats < pendingMergeReservation.partySize) continue
        const selectedSorted = [...selected].sort((a, b) => a.num - b.num)
        const nums = [baseNum, ...selectedSorted.map((c) => c.num)].sort((a, b) => a - b)
        const scopeTableIds = [table.id, ...selectedSorted.map((c) => c.id)]
        if (getScopeConflict(scopeTableIds)) continue
        results.push({
          mergeLabel: getMergeLabel(nums),
          totalSeats,
          scopeTableIds,
        })
      }
    }

    const deduped = results.filter((option, index, arr) =>
      arr.findIndex((other) => other.mergeLabel === option.mergeLabel) === index
    )
    deduped.sort((a, b) => {
      if (a.totalSeats !== b.totalSeats) return a.totalSeats - b.totalSeats
      if (a.scopeTableIds.length !== b.scopeTableIds.length) return a.scopeTableIds.length - b.scopeTableIds.length
      return a.mergeLabel.localeCompare(b.mergeLabel, 'ko')
    })
    if (deduped.length === 0) return deduped
    const minSeats = deduped[0].totalSeats
    const minCount = Math.min(...deduped.filter((o) => o.totalSeats === minSeats).map((o) => o.scopeTableIds.length))
    return deduped.filter((option) => option.totalSeats === minSeats && option.scopeTableIds.length === minCount)
  }, [pendingMergeReservation, table, effectiveTables, baseTableIds, sessionTableStates])

  const pendingMergeUnavailableReason = useMemo(() => {
    if (!pendingMergeReservation || pendingMergeOptions.length > 0) return null

    if (table.status === 'occupied' && table.mergedFrom && table.mergedFrom.length >= 2) {
      const maxSeats = table.mergedFrom.reduce((sum, o) => sum + o.seats, 0)
      if (maxSeats < pendingMergeReservation.partySize) {
        return `필요 좌석(${pendingMergeReservation.partySize})보다 병합 가능 좌석(${maxSeats})이 부족합니다.`
      }
      return '동일 시간대 기존 예약과 충돌하여 배정 가능한 범위가 없습니다.'
    }

    if (!baseTableIds.has(table.id)) {
      return '현재 테이블은 병합 기준 테이블이 아닙니다.'
    }

    const nearbySeats = effectiveTables
      .filter((t) => t.id !== table.id)
      .filter((t) => baseTableIds.has(t.id))
      .filter((t) => t.status === 'available')
      .filter((t) => isSameColumn(t, table))
      .reduce((sum, t) => sum + t.seats, table.seats)
    if (nearbySeats < pendingMergeReservation.partySize) {
      return `필요 좌석(${pendingMergeReservation.partySize})보다 인접 빈 좌석(${nearbySeats})이 부족합니다.`
    }
    return '동일 시간대 기존 예약과 충돌하여 배정 가능한 조합이 없습니다.'
  }, [pendingMergeReservation, pendingMergeOptions.length, table, baseTableIds, effectiveTables])

  const handleSelectNextBooking = (reservation: Reservation) => {
    if (table.status === 'occupied' && table.mergedFrom && table.mergedFrom.length >= 2) {
      setPendingMergeReservationId(reservation.id)
      return
    }
    if (reservation.partySize <= table.seats) {
      const planned = sessionTableStates[table.id]?.plannedBookings ?? (sessionTableStates[table.id]?.nextBooking ? [sessionTableStates[table.id]!.nextBooking!] : [])
      const conflict = planned.find((b) =>
        bookingConflictsOnSameTable(
          b,
          { startTime: reservation.startTime, endTime: reservation.endTime },
          reservation.id
        )
      )
      if (conflict) {
        toast.show(
          `${table.label} 시간 충돌: ${conflict.name} (${conflict.startTime}~${conflict.endTime})`,
          'error'
        )
        return
      }
      onSetNextBooking(table.id, reservation.id)
      setPendingMergeReservationId(null)
      setShowNextBookingSelect(false)
      return
    }
    setPendingMergeReservationId(reservation.id)
  }

  const handleAssignMergedNextBooking = (reservation: Reservation, mergeLabel: string, scopeTableIds: string[]) => {
    onSetNextBookingMulti(scopeTableIds, reservation.id, mergeLabel)
    setPendingMergeReservationId(null)
    setShowNextBookingSelect(false)
  }

  const rawDisplayNextBooking = table.nextBooking ?? mirroredNextBookingSource?.nextBooking ?? null
  const nextBookingSourceTableId = table.nextBooking ? table.id : (mirroredNextBookingSource?.tableId ?? table.id)
  const isMirroredNextBooking = !table.nextBooking && !!mirroredNextBookingSource
  const displayPlannedBookings = useMemo(() => {
    const sessionTableStates = store.sessionData[activeSession].tableStates
    const buckets: Array<NonNullable<typeof table.nextBooking>> = []

    const tableScopeIds =
      table.mergedFrom && table.mergedFrom.length >= 2
        ? table.mergedFrom.map((o) => o.id)
        : [table.id]

    for (const [stateTableId, ts] of Object.entries(sessionTableStates)) {
      const planned = ts?.plannedBookings ?? (ts?.nextBooking ? [ts.nextBooking] : [])
      for (const booking of planned) {
        const bookingScope = booking.scopeTableIds && booking.scopeTableIds.length > 0
          ? booking.scopeTableIds
          : [stateTableId]
        if (bookingScopesOverlap(bookingScope, tableScopeIds)) {
          buckets.push(booking)
        }
      }
    }

    if (nextBookingSourceTableId) {
      const ts = sessionTableStates[nextBookingSourceTableId]
      const planned = ts?.plannedBookings ?? (ts?.nextBooking ? [ts.nextBooking] : [])
      buckets.push(...planned)
    }

    const deduped = buckets.filter((booking, index, arr) =>
      arr.findIndex((b) =>
        b.reservationId === booking.reservationId &&
        b.startTime === booking.startTime &&
        b.endTime === booking.endTime &&
        (b.targetLabel ?? '') === (booking.targetLabel ?? '')
      ) === index
    )

    return deduped.sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [store.sessionData, activeSession, nextBookingSourceTableId, table.id, table.mergedFrom])

  const getBookingScopeIds = (booking: NonNullable<TableInfo['nextBooking']>) => {
    if (booking.scopeTableIds && booking.scopeTableIds.length > 0) return booking.scopeTableIds
    const label = booking.targetLabel
    if (!label) return []
    const match = label.match(/^T(\d+)-(\d+)$/)
    if (!match) return []
    const start = parseInt(match[1], 10)
    const end = parseInt(match[2], 10)
    const min = Math.min(start, end)
    const max = Math.max(start, end)
    return store.tables
      .filter((t) => {
        const num = getTableNumber(t.label)
        return num >= min && num <= max
      })
      .sort((a, b) => getTableNumber(a.label) - getTableNumber(b.label))
      .map((t) => t.id)
  }
  const getBookingDisplayLabel = (booking: NonNullable<TableInfo['nextBooking']>) => {
    if (booking.targetLabel) return booking.targetLabel
    const scopeIds = booking.scopeTableIds ?? []
    if (scopeIds.length === 0) return null
    const labels = scopeIds
      .map((id) => tableLabelById.get(id))
      .filter((v): v is string => !!v)
    if (labels.length === 0) return null
    const nums = labels.map((label) => getTableNumber(label)).sort((a, b) => a - b)
    if (nums.length === 1) return `T${nums[0]}`
    return getMergeLabel(nums)
  }

  const displayNextBooking = rawDisplayNextBooking ?? (displayPlannedBookings[0] ?? null)
  const isDerivedFromPlannedOnly = !rawDisplayNextBooking && !!displayNextBooking

  const displayNextBookingHasAssignedScope =
    !!displayNextBooking && (
      (displayNextBooking.scopeTableIds?.length ?? 0) > 0 ||
      !!displayNextBooking.targetLabel
    )

  const primaryNextBooking = useMemo(() => {
    if (displayPlannedBookings.length > 0) return displayPlannedBookings[0]
    return displayNextBooking
  }, [displayPlannedBookings, displayNextBooking])

  const simultaneousNextBookings = useMemo(() => {
    if (!primaryNextBooking) return []
    return displayPlannedBookings.filter((booking) => booking.startTime === primaryNextBooking.startTime)
  }, [displayPlannedBookings, primaryNextBooking])
  const nextBookingsForCard = useMemo(() => {
    if (simultaneousNextBookings.length > 0) return simultaneousNextBookings
    return displayNextBooking ? [displayNextBooking] : []
  }, [simultaneousNextBookings, displayNextBooking])

  if (!displayNextBooking && table.status !== 'occupied') return null

  return (
    <div className="border-t border-border pt-2">
      {displayNextBooking ? (
          <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-charcoal flex items-center gap-1">
              <CalendarClock size={11} className="text-reserved" />
              다음 예약
            </p>
            <button
              onClick={() => {
                if (displayNextBooking && isDerivedFromPlannedOnly) {
                  store.clearNextBookingByReservation(displayNextBooking.reservationId)
                  return
                }
                onClearNextBooking(nextBookingSourceTableId)
              }}
              className="text-charcoal-lighter hover:text-occupied transition-colors"
            >
              <X size={12} />
            </button>
          </div>
          <div className="text-[12px] bg-reserved/10 rounded-lg px-2 py-1.5 space-y-1.5">
            {nextBookingsForCard.map((booking) => (
              <div
                key={`next-card-${booking.reservationId}-${booking.startTime}-${booking.targetLabel ?? ''}`}
                className="rounded-md border border-reserved/20 bg-surface/60 px-2 py-1 space-y-0.5"
              >
                <p className="font-medium text-charcoal leading-tight">
                  <span className="inline-block max-w-[118px] truncate align-bottom">{booking.name}</span>
                  <span className="text-charcoal-lighter ml-1">({booking.partySize}명)</span>
                </p>
                <p className="text-charcoal-lighter leading-none">{booking.startTime} ~ {booking.endTime}</p>
                {getBookingDisplayLabel(booking) && (
                  <p className="text-[9px] text-reserved leading-none">{getBookingDisplayLabel(booking)}</p>
                )}
              </div>
            ))}
            {canSeatDisplayedNextBooking && onSeatDisplayedNextBooking && (
              <button
                onClick={onSeatDisplayedNextBooking}
                className="mt-1 w-full inline-flex items-center justify-center text-[12px] font-medium py-1 rounded-lg text-white bg-available hover:bg-available/85 transition-colors"
              >
                착석
              </button>
            )}
          </div>
          {displayPlannedBookings.length > 0 && (
            <div className="rounded-lg border border-reserved/15 bg-surface/70 px-2 py-1.5">
              <p className="text-[12px] font-medium text-charcoal mb-1">예약 배정 {displayPlannedBookings.length}건</p>
              <div className="space-y-1">
                {displayPlannedBookings.map((booking) => (
                  <div
                    key={`${booking.reservationId}-${booking.startTime}-${booking.targetLabel ?? ''}`}
                    className="flex items-center justify-between gap-2 text-[12px] rounded-md px-1 py-0.5 hover:bg-reserved/5"
                    onMouseEnter={() => {
                      const scope = getBookingScopeIds(booking)
                      if (scope.length > 0) store.setMergePreviewTableIds(scope)
                    }}
                    onMouseLeave={() => store.setMergePreviewTableIds([])}
                    >
                    <div className="min-w-0">
                      <p className="text-charcoal leading-tight">
                        <span className="truncate inline-block max-w-[112px] align-bottom">{booking.name}</span>
                        <span className="text-charcoal-lighter ml-1">({booking.partySize})</span>
                      </p>
                      <p className="text-charcoal-lighter leading-tight">
                        {booking.startTime} ~ {booking.endTime}
                        {getBookingDisplayLabel(booking) ? ` · ${getBookingDisplayLabel(booking)}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => store.clearNextBookingByReservation(booking.reservationId)}
                        className="text-charcoal-lighter hover:text-occupied transition-colors"
                        title="이 예약 배정 해제"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {table.status === 'occupied' && (
            <button
              onClick={() => setShowNextBookingSelect(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-medium py-1.5 rounded-lg text-reserved bg-reserved/10 hover:bg-reserved/20 transition-colors"
            >
              예약 추가 배정
            </button>
          )}
          {!isMirroredNextBooking && table.mergedFrom && table.mergedFrom.length >= 2 && !displayNextBookingHasAssignedScope && (
            <div className="space-y-1">
              <p className="text-[12px] text-charcoal-lighter">착석 위치:</p>
              <div className="flex flex-wrap gap-1">
                {table.mergedFrom.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => onSetTargetLabel(table.id, o.label)}
                    className={cn(
                      'text-[12px] font-medium px-1.5 py-0.5 rounded-md transition-colors',
                      displayNextBooking?.targetLabel === o.label
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
                    'text-[12px] font-medium px-1.5 py-0.5 rounded-md transition-colors',
                    !displayNextBooking?.targetLabel
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
      ) : isMirroredNextBooking ? (
        <div className="rounded-lg border border-reserved/15 bg-reserved/5 px-2 py-1.5">
          <p className="text-[12px] text-charcoal-lighter">
            병합 예정 범위 테이블입니다.
          </p>
        </div>
      ) : showNextBookingSelect ? (
        <div className="space-y-1.5">
          {!pendingMergeReservation ? (
            <>
              <p className="text-[12px] text-charcoal-lighter">예약 선택:</p>
              {waitingReservations.length > 0 ? (
                waitingReservations.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectNextBooking(r)}
                    className="w-full flex items-center justify-between text-[12px] px-2 py-1.5 rounded-lg bg-cream hover:bg-reserved/10 text-charcoal transition-colors gap-2"
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
                <p className="text-[12px] text-charcoal-lighter">대기 중인 예약 없음</p>
              )}
            </>
          ) : (
            <div className="space-y-1.5 rounded-lg border border-reserved/20 bg-reserved/5 p-2">
              <p className="text-[12px] font-medium text-charcoal">
                {pendingMergeReservation.name}
                <span className="text-charcoal-lighter ml-1">({pendingMergeReservation.partySize}명)</span>
              </p>
              <p className="text-[12px] text-charcoal-lighter">예약 배정할 테이블을 선택하세요:</p>
              {pendingMergeOptions.length > 0 ? (
                <>
                  <button
                    onClick={() => {
                      const best = pendingMergeOptions[0]
                      if (!best) return
                      handleAssignMergedNextBooking(pendingMergeReservation, best.mergeLabel, best.scopeTableIds)
                    }}
                    className="w-full text-[12px] font-medium py-1 rounded-lg bg-reserved/15 hover:bg-reserved/20 text-reserved transition-colors"
                  >
                    추천으로 배정 ({pendingMergeOptions[0].mergeLabel})
                  </button>
                  <div className="flex flex-wrap gap-1">
                    {pendingMergeOptions.map((option) => (
                      <button
                        key={`${option.mergeLabel}-${option.scopeTableIds.join(',')}`}
                        onClick={() => handleAssignMergedNextBooking(pendingMergeReservation, option.mergeLabel, option.scopeTableIds)}
                        className="text-[12px] font-medium px-1.5 py-0.5 rounded-md bg-cream hover:bg-reserved/10 text-charcoal border border-border transition-colors"
                      >
                        {option.mergeLabel}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[12px] text-occupied">{pendingMergeUnavailableReason ?? '현재는 병합 가능한 조합이 없습니다.'}</p>
              )}
              <button
                onClick={() => setPendingMergeReservationId(null)}
                className="text-[12px] text-charcoal-lighter hover:text-charcoal"
              >
                이전으로
              </button>
            </div>
          )}
          <button
            onClick={() => { setPendingMergeReservationId(null); setShowNextBookingSelect(false) }}
            className="text-[12px] text-charcoal-lighter hover:text-charcoal"
          >
            취소
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNextBookingSelect(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-medium py-1.5 rounded-xl text-reserved bg-reserved/10 hover:bg-reserved/20 transition-colors"
        >
          <CalendarClock size={12} />
          예약 걸어두기
        </button>
      )}
    </div>
  )
}
