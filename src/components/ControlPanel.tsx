import { useState, useEffect } from 'react'
import {
  Users, Clock, Info,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { useToastStore } from '@/store/useToastStore'
import { toastActions, toastMessages } from '@/features/toast/toastPresets'
import {
  compareTableLabel,
  getFixedEndTime,
  getCurrentTimeHHMM,
  getMergeLabel,
  getTableNumber,
  isContiguousRange,
  timeToMinutes,
} from '@/data/dummy'
import type { TableInfo } from '@/data/dummy'
import { planAdjacentMerge } from '@/store/mergePlanner'
import AvailableTableActions from './control-panel/AvailableTableActions'
import NextBookingSection from './control-panel/NextBookingSection'
import OccupiedMoveClearActions from './control-panel/OccupiedMoveClearActions'
import ReservedTableActionSection from './control-panel/ReservedTableActionSection'
import TableEditPanel from './TableEditPanel'

function normalizeToQuarter(time: string): string {
  const mins = timeToMinutes(time)
  const rounded = Math.ceil(mins / 15) * 15
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

export default function ControlPanel() {
  const store = useReservationStore()
  const {
    focusedTableId,
    reservations,
    isEditMode,
    activeSession,
    clearTable,
    walkInTable,
    walkInWithSelectedMerge,
    moveToTable,
    seatReservation,
    seatWithSelectedMerge,
    setNextBooking,
    clearNextBooking,
    clearNextBookingByReservation,
    setNextBookingTargetLabel,
    saveUndoSnapshot,
    setMergePreviewTableIds,
    undo,
  } = store
  const toast = useToastStore()

  const effectiveTables = store.getEffectiveTables()
  const session = store.sessionData[activeSession]
  const table = focusedTableId ? effectiveTables.find((t) => t.id === focusedTableId) ?? null : null

  const [showWalkIn, setShowWalkIn] = useState(false)
  const [walkInSize, setWalkInSize] = useState(2)
  const [walkInName, setWalkInName] = useState('')
  const initialWalkInStart = normalizeToQuarter(getCurrentTimeHHMM())
  const [walkInStartTime, setWalkInStartTime] = useState(initialWalkInStart)
  const [walkInEndTime, setWalkInEndTime] = useState(getFixedEndTime(initialWalkInStart))
  const [showMoveSelect, setShowMoveSelect] = useState(false)
  const [showNextBookingSelect, setShowNextBookingSelect] = useState(false)
  const [selectedMergeTableIds, setSelectedMergeTableIds] = useState<string[]>([])
  const [pendingSeatMergeReservationId, setPendingSeatMergeReservationId] = useState<string | null>(null)

  const resetSubState = () => {
    setShowWalkIn(false)
    setWalkInSize(2)
    setWalkInName('')
    const base = normalizeToQuarter(getCurrentTimeHHMM())
    setWalkInStartTime(base)
    setWalkInEndTime(getFixedEndTime(base))
    setShowMoveSelect(false)
    setShowNextBookingSelect(false)
    setSelectedMergeTableIds([])
    setPendingSeatMergeReservationId(null)
  }

  useEffect(() => {
    resetSubState()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedTableId])

  const isSameColumn = (a: TableInfo, b: TableInfo) => Math.abs(a.x - b.x) <= 42

  const mergePreviewBaseTableId = table?.id ?? null
  const mergePreviewEligible =
    !!table &&
    table.status === 'available' &&
    !!table.nextBooking &&
    table.nextBooking.partySize > table.seats

  useEffect(() => {
    if (!mergePreviewEligible || !mergePreviewBaseTableId) {
      setMergePreviewTableIds([])
      return
    }
    if (selectedMergeTableIds.length === 0) {
      setMergePreviewTableIds([])
      return
    }
    setMergePreviewTableIds([mergePreviewBaseTableId, ...selectedMergeTableIds])
  }, [mergePreviewEligible, mergePreviewBaseTableId, selectedMergeTableIds, setMergePreviewTableIds])

  const linkedReservation = table?.currentTeam?.reservationId
    ? reservations.find((r) => r.id === table.currentTeam!.reservationId)
    : null

  const mirroredNextBookingSource = (() => {
    if (!table || table.nextBooking) return null
    for (const t of effectiveTables) {
      const nb = t.nextBooking
      if (!nb || t.id === table.id) continue
      if (nb.scopeTableIds?.includes(table.id)) {
        return { tableId: t.id, tableLabel: t.label, nextBooking: nb }
      }
      const label = nb.targetLabel
      if (!label) continue
      const targetNum = getTableNumber(table.label)
      const rangeMatch = label.match(/^T(\d+)(?:[+\-~]T?)(\d+)$/)
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10)
        const end = parseInt(rangeMatch[2], 10)
        const min = Math.min(start, end)
        const max = Math.max(start, end)
        if (targetNum >= min && targetNum <= max) {
          return { tableId: t.id, tableLabel: t.label, nextBooking: nb }
        }
      }
    }
    return null
  })()
  const detailNextBooking = table?.nextBooking ?? mirroredNextBookingSource?.nextBooking ?? null
  const detailNextBookingSourceTableId = table?.nextBooking ? table.id : mirroredNextBookingSource?.tableId
  const detailNextBookingHasPlannedMerge =
    (detailNextBooking?.scopeTableIds?.length ?? 0) >= 2 ||
    (!!detailNextBooking?.targetLabel && /[+\-~]/.test(detailNextBooking.targetLabel))

  const handleSeatDisplayedNextBooking = () => {
    if (!table || !detailNextBooking || !detailNextBookingSourceTableId) return

    // If a planned merge label exists (e.g. T1-4), seat using that full planned range from any table in the range.
    if (detailNextBookingHasPlannedMerge) {
      let plannedTables = (detailNextBooking.scopeTableIds ?? [])
        .map((id) => effectiveTables.find((t) => t.id === id))
        .filter(Boolean)
        .sort((a, b) => compareTableLabel(a!.label, b!.label)) as TableInfo[]

      if (plannedTables.length < 2 && detailNextBooking.targetLabel) {
        const match = detailNextBooking.targetLabel.match(/^T(\d+)(?:[+\-~]T?)(\d+)$/)
        if (match) {
          const start = parseInt(match[1], 10)
          const end = parseInt(match[2], 10)
          const min = Math.min(start, end)
          const max = Math.max(start, end)
          plannedTables = effectiveTables
            .filter((t) => {
              const num = getTableNumber(t.label)
              return num >= min && num <= max
            })
            .sort((a, b) => compareTableLabel(a.label, b.label))
        }
      }

      const base = plannedTables[0]
      if (base) {
        const mergeIds = plannedTables.slice(1).map((t) => t.id)
        seatWithSelectedMerge(detailNextBooking.reservationId, base.id, mergeIds)
        clearNextBookingByReservation(detailNextBooking.reservationId)
        toast.show('다음 예약을 병합 착석 처리했습니다.', 'success')
        resetSubState()
        return
      }
    }

    if (detailNextBooking.partySize <= table.seats) {
      seatReservation(detailNextBooking.reservationId, table.id)
      clearNextBookingByReservation(detailNextBooking.reservationId)
      toast.show('다음 예약을 착석 처리했습니다.', 'success')
      resetSubState()
    }
  }

  // Filter waiting reservations by active session
  const assignedWaitingReservationIds = new Set(
    Object.values(session.tableStates)
      .flatMap((ts) => (ts.plannedBookings ?? (ts.nextBooking ? [ts.nextBooking] : [])))
      .map((b) => b.reservationId)
  )

  const waitingReservations = table
    ? reservations.filter(
        (r) => r.status === 'waiting' && r.period === activeSession && !assignedWaitingReservationIds.has(r.id)
      )
    : []

  const waitingReservationsForNextBooking = (() => {
    if (!table || table.status !== 'occupied') return []

    const baseTableIds = new Set(store.tables.map((t) => t.id))
    const isBaseTable = baseTableIds.has(table.id)
    const baseNum = getTableNumber(table.label)

    return reservations.filter((r) => {
      if (r.status !== 'waiting' || r.period !== activeSession) return false
      if (assignedWaitingReservationIds.has(r.id)) return false
      if (r.partySize <= table.seats) return true
      if (!isBaseTable) return false

      const candidates = effectiveTables
        .filter((t) => t.id !== table.id)
        .filter((t) => baseTableIds.has(t.id))
        .filter((t) => t.status === 'available')
        .filter((t) => isSameColumn(t, table))
        .map((t) => ({ id: t.id, num: getTableNumber(t.label), seats: t.seats }))

      return !!planAdjacentMerge(baseNum, table.seats, r.partySize, candidates)
    })
  })()

  const availableForMove = table
    ? [...effectiveTables.filter((t) => t.status === 'available' && t.id !== table.id)].sort(
        (a, b) => compareTableLabel(a.label, b.label)
      )
    : []

  const handleWalkIn = () => {
    if (!table) return
    const tableId = table.id
    if (timeToMinutes(walkInEndTime) <= timeToMinutes(walkInStartTime)) {
      toast.show('워크인 종료 시간은 시작 시간보다 늦어야 합니다.', 'error')
      return
    }
    if (detailNextBooking && table.status === 'available') {
      const nowMins = timeToMinutes(getCurrentTimeHHMM())
      const nextMins = timeToMinutes(detailNextBooking.startTime)
      const minsLeft = nextMins - nowMins
      if (minsLeft < 90) {
        const msg = minsLeft >= 0
          ? minsLeft <= 15
            ? `${detailNextBooking.startTime} 예약 ${minsLeft}분 전입니다. 워크인 배정 시 다음 예약이 지연될 수 있습니다.`
            : minsLeft <= 30
              ? `${detailNextBooking.startTime} 예약 ${minsLeft}분 전입니다. 워크인 배정을 진행할까요?`
              : `${detailNextBooking.startTime} 예약이 예정되어 있습니다. 워크인 배정을 진행할까요?`
          : `다음 예약 시간(${detailNextBooking.startTime})이 지났습니다. 워크인 배정을 진행할까요?`
        if (!window.confirm(msg)) return
        if (minsLeft <= 15 && minsLeft >= 0) {
          if (!window.confirm('정말 진행할까요? 진행하면 다음 예약 준비 시간이 매우 짧아집니다.')) return
        }
      }
    }
    walkInTable(tableId, walkInSize, walkInName.trim() || undefined, walkInStartTime, walkInEndTime)
    const after = useReservationStore.getState()
    const occupied = after.getEffectiveTables().find((t) => t.id === tableId || t.mergedFrom?.some((o) => o.id === tableId))
    if (!occupied || occupied.status !== 'occupied') {
      toast.show(toastMessages.seatingFailedNoCapacity, 'error')
      return
    }
    resetSubState()
  }

  const walkInMergeCandidates = (() => {
    if (!table || table.status !== 'available') return []
    const baseTableIds = new Set(store.tables.map((t) => t.id))
    return effectiveTables
      .filter((t) => t.id !== table.id)
      .filter((t) => baseTableIds.has(t.id))
      .filter((t) => t.status === 'available')
      .filter((t) => isSameColumn(t, table))
      .sort((a, b) => {
        const aDist = Math.abs(a.x - table.x) + Math.abs(a.y - table.y)
        const bDist = Math.abs(b.x - table.x) + Math.abs(b.y - table.y)
        if (aDist !== bDist) return aDist - bDist
        if (a.seats !== b.seats) return a.seats - b.seats
        return compareTableLabel(a.label, b.label)
      })
  })()

  const handleSubmitWalkInMerge = (selectedIds: string[]) => {
    if (!table) return
    if (timeToMinutes(walkInEndTime) <= timeToMinutes(walkInStartTime)) {
      toast.show('워크인 종료 시간은 시작 시간보다 늦어야 합니다.', 'error')
      return
    }
    const tableId = table.id
    walkInWithSelectedMerge(
      tableId,
      walkInSize,
      walkInName.trim() || undefined,
      selectedIds,
      walkInStartTime,
      walkInEndTime
    )
    const after = useReservationStore.getState()
    const occupied = after.getEffectiveTables().find((t) => t.id === tableId || t.mergedFrom?.some((o) => o.id === tableId))
    if (!occupied || occupied.status !== 'occupied') {
      toast.show(toastMessages.seatingFailedNoCapacity, 'error')
      return
    }
    toast.show(`병합(${occupied.label})으로 워크인 배정했습니다.`, 'success')
    resetSubState()
  }

  const handleMove = (toTableId: string) => {
    if (!table) return
    moveToTable(table.id, toTableId)
    const after = useReservationStore.getState()
    const fromStillOccupied = after.sessionData[after.activeSession].tableStates[table.id]?.status === 'occupied'
    if (fromStillOccupied) {
      toast.show(toastMessages.moveFailedNoCapacity, 'error')
    }
    resetSubState()
  }

  const handleClearFocusedTable = () => {
    if (!table) return
    const collectAutoSeatCandidates = () => {
      const tableStates = store.sessionData[activeSession].tableStates
      const buckets = [
        ...(tableStates[table.id]?.plannedBookings ?? (tableStates[table.id]?.nextBooking ? [tableStates[table.id].nextBooking!] : [])),
      ]
      if (table.mergedFrom && table.mergedFrom.length >= 2) {
        for (const origin of table.mergedFrom) {
          const planned = tableStates[origin.id]?.plannedBookings ?? (tableStates[origin.id]?.nextBooking ? [tableStates[origin.id].nextBooking!] : [])
          buckets.push(...planned)
        }
      }
      const deduped = buckets.filter((b, i, arr) =>
        arr.findIndex((x) =>
          x.reservationId === b.reservationId &&
          x.startTime === b.startTime &&
          x.endTime === b.endTime &&
          (x.targetLabel ?? '') === (b.targetLabel ?? '')
        ) === i
      ).sort((a, b) => a.startTime.localeCompare(b.startTime))
      if (deduped.length === 0) return []
      const earliest = deduped[0].startTime
      return deduped.filter((b) => b.startTime === earliest)
    }

    const autoSeatCandidates = collectAutoSeatCandidates()
    if (autoSeatCandidates.length > 0) {
      const queue = autoSeatCandidates.map((b) => `${b.name}(${b.partySize}) ${b.startTime}`).join(', ')
      if (!window.confirm(`이 작업을 하면 다음 팀이 자동 착석됩니다:\n${queue}\n진행할까요?`)) return
    }
    saveUndoSnapshot('테이블 비우기')
    clearTable(table.id)
    toast.show(`${table.label} 테이블을 비웠습니다.`, 'info', toastActions.undo(() => undo()))
    resetSubState()
  }

  const manualMergePrompt = (() => {
    if (!table || table.status !== 'available' || !table.nextBooking) return null
    if (table.nextBooking.partySize <= table.seats) return null

    const baseNum = getTableNumber(table.label)
    const baseTableIds = new Set(store.tables.map((t) => t.id))
    const allAdjacentCandidates = effectiveTables
      .filter((t) => t.id !== table.id)
      .filter((t) => baseTableIds.has(t.id))
      .filter((t) => t.status === 'available')
      .filter((t) => isSameColumn(t, table))
      .map((t) => ({ id: t.id, num: getTableNumber(t.label), seats: t.seats, label: t.label }))
      .sort((a, b) => compareTableLabel(a.label, b.label))

    // Offer contiguous available chains from the base table on each side.
    // Example: if T5 is free and T6 is free, both are selectable; if T5 is occupied, T6 is not offered.
    const byNum = new Map(allAdjacentCandidates.map((c) => [c.num, c]))
    const reachableLeft: typeof allAdjacentCandidates = []
    const reachableRight: typeof allAdjacentCandidates = []
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

    const neededExtraSeats = Math.max(0, table.nextBooking.partySize - table.seats)
    const maxReachableExtraSeats = [...reachableLeft, ...reachableRight].reduce((sum, c) => sum + c.seats, 0)
    let budgetSeats = 0
    const pickedNums = new Set<number>()
    let li = 0
    let ri = 0
    // Expand outward from the base and stop once we have enough selectable seats.
    while (budgetSeats < neededExtraSeats && (li < reachableLeft.length || ri < reachableRight.length)) {
      if (ri < reachableRight.length) {
        const c = reachableRight[ri++]
        pickedNums.add(c.num)
        budgetSeats += c.seats
        if (budgetSeats >= neededExtraSeats) break
      }
      if (li < reachableLeft.length) {
        const c = reachableLeft[li++]
        pickedNums.add(c.num)
        budgetSeats += c.seats
        if (budgetSeats >= neededExtraSeats) break
      }
    }

    const candidates = (maxReachableExtraSeats >= neededExtraSeats
      ? [...reachableLeft, ...reachableRight].filter((c) => pickedNums.has(c.num))
      : [])
      .sort((a, b) => compareTableLabel(a.label, b.label))

    const selected = candidates.filter((c) => selectedMergeTableIds.includes(c.id))
    const selectedNums = [baseNum, ...selected.map((c) => c.num)]
    const selectedSeats = table.seats + selected.reduce((sum, c) => sum + c.seats, 0)
    const isContiguousSelection = isContiguousRange(selectedNums)
    const hasEnoughSeats = selectedSeats >= table.nextBooking.partySize
    const alternativeTables = effectiveTables
      .filter((t) => t.id !== table.id)
      .filter((t) => t.status === 'available')
      .filter((t) => t.seats >= table.nextBooking!.partySize)
      .sort((a, b) => {
        const aNum = getTableNumber(a.label)
        const bNum = getTableNumber(b.label)
        const aInColumn = isSameColumn(a, table)
        const bInColumn = isSameColumn(b, table)
        if (aInColumn !== bInColumn) return aInColumn ? -1 : 1
        const aDist = Math.abs(aNum - baseNum)
        const bDist = Math.abs(bNum - baseNum)
        if (aDist !== bDist) return aDist - bDist
        if (a.seats !== b.seats) return a.seats - b.seats
        return compareTableLabel(a.label, b.label)
      })

    return {
      candidates,
      reservationId: table.nextBooking.reservationId,
      selectedIds: selectedMergeTableIds,
      selectedNums,
      selectedSeats,
      requiredSeats: table.nextBooking.partySize,
      isContiguousSelection,
      hasEnoughSeats,
      canSeat: selected.length > 0 && isContiguousSelection && hasEnoughSeats,
      localMergePossible: maxReachableExtraSeats >= neededExtraSeats,
      alternativeTables,
    }
  })()

  const handleSeatAtAlternativeTable = (sourceTableId: string, reservationId: string, targetTableId: string, targetLabel: string) => {
    if (!window.confirm(`${targetLabel}로 바로 착석 처리할까요?`)) return
    clearNextBooking(sourceTableId)
    seatReservation(reservationId, targetTableId)
    toast.show(`다른 빈 테이블(${targetLabel})로 착석 처리했습니다.`, 'success')
    setSelectedMergeTableIds([])
  }

  const pendingSeatMergeReservation =
    table && pendingSeatMergeReservationId
      ? waitingReservations.find((r) => r.id === pendingSeatMergeReservationId) ?? null
      : null

  const seatMergeOptions = (() => {
    if (!table || table.status !== 'available' || !pendingSeatMergeReservation) return []
    if (pendingSeatMergeReservation.partySize <= table.seats) return []

    const baseNum = getTableNumber(table.label)
    const baseTableIds = new Set(store.tables.map((t) => t.id))
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

    const results: Array<{ key: string; label: string; mergeTableIds: string[]; totalSeats: number }> = []
    for (let lCount = 0; lCount <= reachableLeft.length; lCount++) {
      for (let rCount = 0; rCount <= reachableRight.length; rCount++) {
        if (lCount === 0 && rCount === 0) continue
        const leftSlice = reachableLeft.slice(0, lCount)
        const rightSlice = reachableRight.slice(0, rCount)
        const selected = [...leftSlice, ...rightSlice]
        const totalSeats = table.seats + selected.reduce((sum, c) => sum + c.seats, 0)
        if (totalSeats < pendingSeatMergeReservation.partySize) continue

        const nums = [baseNum, ...selected.map((c) => c.num)].sort((a, b) => a - b)
        if (!isContiguousRange(nums)) continue

        results.push({
          key: nums.join('-'),
          label: getMergeLabel(nums),
          mergeTableIds: selected.map((c) => c.id),
          totalSeats,
        })
      }
    }

    const sorted = results.sort((a, b) => {
      if (a.totalSeats !== b.totalSeats) return a.totalSeats - b.totalSeats
      if (a.mergeTableIds.length !== b.mergeTableIds.length) return a.mergeTableIds.length - b.mergeTableIds.length
      return a.label.localeCompare(b.label, 'ko')
    })

    if (sorted.length === 0) return sorted

    const minTotalSeats = sorted[0].totalSeats
    const minTableCount = Math.min(
      ...sorted.filter((option) => option.totalSeats === minTotalSeats).map((option) => option.mergeTableIds.length)
    )

    return sorted.filter(
      (option) => option.totalSeats === minTotalSeats && option.mergeTableIds.length === minTableCount
    )
  })()

  return (
    <aside className="w-full md:w-[clamp(198px,13vw,224px)] md:min-w-[198px] h-full bg-surface md:border-l border-border flex flex-col overflow-y-auto">
      {/* Section: TableEditPanel (edit mode) */}
      {isEditMode && (
        <div className="overflow-y-auto flex-1">
          <TableEditPanel />
        </div>
      )}

      {/* Section: Table Detail (normal mode) */}
      {!isEditMode && (
        <div className="flex-1 px-3 py-3">
          {!table ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-8">
              <div className="w-10 h-10 rounded-2xl bg-cream flex items-center justify-center">
                <Info size={18} className="text-charcoal-lighter" />
              </div>
              <p className="text-[12px] text-charcoal-lighter leading-snug">
                테이블 선택 시<br />상세 정보 표시
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table header */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-[13px] font-bold text-charcoal">{table.label}</span>
                <div className="flex items-center gap-1 text-[12px] text-charcoal-lighter">
                  <Users size={12} />
                  {table.seats}인석
                </div>
              </div>

              {/* Occupied + reservation linked */}
              {table.status === 'occupied' && linkedReservation && (
                <div className="space-y-2">
                  <OccupiedMoveClearActions
                    showMoveSelect={showMoveSelect}
                    availableForMove={availableForMove}
                    onMove={handleMove}
                    onShowMoveSelect={() => setShowMoveSelect(true)}
                    onCancelMoveSelect={() => setShowMoveSelect(false)}
                    onClear={handleClearFocusedTable}
                  />

                  <div className="text-[12px] space-y-1">
                    <p className="font-medium text-charcoal">
                      {linkedReservation.name}
                      <span className="text-charcoal-lighter ml-1">({linkedReservation.partySize}명)</span>
                    </p>
                    <div className="flex items-center gap-1 text-charcoal-lighter">
                      <Clock size={11} />
                      {linkedReservation.startTime} ~ {linkedReservation.endTime}
                    </div>
                  </div>
                </div>
              )}

              {/* Occupied + walk-in */}
              {table.status === 'occupied' && !linkedReservation && (
                <div className="space-y-2">
                  <OccupiedMoveClearActions
                    showMoveSelect={showMoveSelect}
                    availableForMove={availableForMove}
                    onMove={handleMove}
                    onShowMoveSelect={() => setShowMoveSelect(true)}
                    onCancelMoveSelect={() => setShowMoveSelect(false)}
                    onClear={handleClearFocusedTable}
                  />

                  <div className="text-[12px] text-charcoal py-0.5">
                    {table.currentTeam
                      ? (
                        <>
                          <span className="font-medium">{table.currentTeam.name}</span>{' '}
                          <span className="text-charcoal-lighter">
                            ({table.currentTeam.partySize}명 · {table.currentTeam.startTime ?? table.currentTeam.seatedAt}~{table.currentTeam.endTime ?? ''})
                          </span>
                        </>
                      )
                      : '사용중'}
                  </div>
                </div>
              )}

              {/* Available */}
              <AvailableTableActions
                table={table}
                showWalkIn={showWalkIn}
                setShowWalkIn={setShowWalkIn}
                walkInName={walkInName}
                setWalkInName={setWalkInName}
                walkInSize={walkInSize}
                setWalkInSize={setWalkInSize}
                walkInStartTime={walkInStartTime}
                setWalkInStartTime={(v) => {
                  setWalkInStartTime(v)
                  if (timeToMinutes(walkInEndTime) <= timeToMinutes(v)) {
                    setWalkInEndTime(getFixedEndTime(v))
                  }
                }}
                walkInEndTime={walkInEndTime}
                setWalkInEndTime={setWalkInEndTime}
                waitingReservations={(mirroredNextBookingSource || table.nextBooking) ? [] : waitingReservations}
                hideEmptyWaitingMessage={!!detailNextBooking}
                onSeatReservation={(reservationId) => {
                  const reservation = waitingReservations.find((r) => r.id === reservationId)
                  if (!reservation) return
                  if (reservation.partySize <= table.seats) {
                    seatReservation(reservationId, table.id)
                    resetSubState()
                    return
                  }
                  setPendingSeatMergeReservationId(reservationId)
                }}
                onWalkIn={handleWalkIn}
                walkInMergeCandidates={walkInMergeCandidates}
                onSubmitWalkInMerge={handleSubmitWalkInMerge}
              />

              <NextBookingSection
                table={table}
                waitingReservations={waitingReservationsForNextBooking}
                showNextBookingSelect={showNextBookingSelect}
                setShowNextBookingSelect={setShowNextBookingSelect}
                onSetNextBooking={setNextBooking}
                onSetNextBookingMulti={store.setNextBookingMulti}
                onClearNextBooking={clearNextBooking}
                onSetTargetLabel={setNextBookingTargetLabel}
                mirroredNextBookingSource={mirroredNextBookingSource}
                canSeatDisplayedNextBooking={
                  table.status === 'available' &&
                  !!detailNextBooking &&
                  !!detailNextBookingSourceTableId &&
                  (detailNextBooking.partySize <= table.seats || detailNextBookingHasPlannedMerge)
                }
                onSeatDisplayedNextBooking={
                  table.status === 'available' &&
                  !!detailNextBooking &&
                  !!detailNextBookingSourceTableId &&
                  (detailNextBooking.partySize <= table.seats || detailNextBookingHasPlannedMerge)
                    ? handleSeatDisplayedNextBooking
                    : undefined
                }
              />

              {table.status === 'available' && pendingSeatMergeReservation && pendingSeatMergeReservation.partySize > table.seats && (
                <div className="border-t border-border pt-2">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-2.5 py-2 space-y-2">
                    <p className="text-[12px] font-medium text-charcoal">
                      {pendingSeatMergeReservation.name}
                      <span className="text-charcoal-lighter ml-1">({pendingSeatMergeReservation.partySize}명)</span>
                    </p>
                    <p className="text-[12px] text-charcoal-lighter">
                      병합 가능한 테이블을 선택해주세요.
                    </p>

                    {seatMergeOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {seatMergeOptions.map((option) => (
                          <button
                            key={option.key}
                            onClick={() => {
                              seatWithSelectedMerge(pendingSeatMergeReservation.id, table.id, option.mergeTableIds)
                              const after = useReservationStore.getState().reservations.find((r) => r.id === pendingSeatMergeReservation.id)
                              if (after?.status !== 'seated') {
                                toast.show(toastMessages.seatingFailedNoCapacity, 'error')
                                return
                              }
                              toast.show(`병합(${option.label})으로 착석 처리했습니다.`, 'success')
                              resetSubState()
                            }}
                            className="text-[12px] font-medium px-1.5 py-0.5 rounded-md border bg-cream text-charcoal border-border hover:border-primary/40 hover:bg-primary/10 transition-colors"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-charcoal-lighter">
                        현재 이 테이블 기준으로 가능한 연속 병합 조합이 없습니다.
                      </p>
                    )}

                    <button
                      onClick={() => setPendingSeatMergeReservationId(null)}
                      className="text-[12px] text-charcoal-lighter hover:text-charcoal transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              {table.status === 'available' &&
                table.nextBooking &&
                table.nextBooking.partySize > table.seats &&
                !mirroredNextBookingSource &&
                !detailNextBookingHasPlannedMerge && (
                <div className="border-t border-border pt-2">
                  <div className="rounded-xl border border-reserved/20 bg-reserved/8 px-2.5 py-2">
                    <p className="text-[12px] font-medium text-charcoal">다음 예약 인원({table.nextBooking.partySize}명)이 현재 테이블 좌석({table.seats})을 초과합니다.</p>
                    {manualMergePrompt && manualMergePrompt.candidates.length > 0 ? (
                      <>
                        <p className="text-[12px] text-charcoal-lighter mt-1">병합할 테이블을 선택해주세요.</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {manualMergePrompt.candidates.map((c) => {
                            const active = manualMergePrompt.selectedIds.includes(c.id)
                            const selectionLocked = manualMergePrompt.hasEnoughSeats && !active
                            return (
                              <button
                                key={c.id}
                                onClick={() => setSelectedMergeTableIds((prev) =>
                                  prev.includes(c.id)
                                    ? prev.filter((id) => id !== c.id)
                                    : (selectionLocked ? prev : [...prev, c.id])
                                )}
                                disabled={selectionLocked}
                                className={cn(
                                  'text-[12px] font-medium px-1.5 py-0.5 rounded-md border transition-colors',
                                  active
                                    ? 'bg-reserved text-white border-reserved'
                                    : 'bg-cream text-charcoal border-border hover:border-reserved/40',
                                  selectionLocked && 'opacity-40 cursor-not-allowed hover:border-border'
                                )}
                              >
                                {c.label} · {c.seats}
                              </button>
                            )
                          })}
                        </div>
                        <p className={cn(
                          'mt-1 text-[12px]',
                          manualMergePrompt.hasEnoughSeats ? 'text-available' : 'text-charcoal-lighter'
                        )}>
                          선택 좌석: {manualMergePrompt.selectedSeats} / 필요 좌석: {manualMergePrompt.requiredSeats}
                        </p>
                        {manualMergePrompt.selectedIds.length > 0 && (
                          <p className="mt-1 text-[12px] text-charcoal-lighter">
                            병합 결과: <span className="text-charcoal font-medium">{getMergeLabel(manualMergePrompt.selectedNums)}</span>
                          </p>
                        )}
                        {manualMergePrompt.hasEnoughSeats && (
                          <p className="mt-1 text-[12px] text-available">필요 좌석을 충족했습니다. 추가 선택은 잠깁니다(선택 해제는 가능).</p>
                        )}
                        {!manualMergePrompt.isContiguousSelection && (
                          <p className="mt-1 text-[12px] text-occupied">연속된 테이블만 함께 병합할 수 있습니다.</p>
                        )}
                        <button
                          onClick={() => {
                            if (!manualMergePrompt.canSeat) return
                            seatWithSelectedMerge(manualMergePrompt.reservationId, table.id, manualMergePrompt.selectedIds)
                            const after = useReservationStore.getState().reservations.find((r) => r.id === manualMergePrompt.reservationId)
                            if (after?.status !== 'seated') {
                              toast.show(toastMessages.seatingFailedNoCapacity, 'error')
                            } else {
                              toast.show('선택한 테이블 병합으로 착석 처리했습니다.', 'success')
                              setSelectedMergeTableIds([])
                            }
                          }}
                          disabled={!manualMergePrompt.canSeat}
                          className="mt-2 w-full inline-flex items-center justify-center text-[12px] font-medium py-1.5 rounded-lg text-reserved bg-reserved/15 hover:bg-reserved/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          선택 병합으로 착석
                        </button>

                        {manualMergePrompt.alternativeTables.length > 0 && !manualMergePrompt.canSeat && (
                          <div className="mt-2 pt-2 border-t border-reserved/20">
                            <p className="text-[12px] text-charcoal-lighter mb-1">옆 테이블 병합이 안 되면, 아래 빈 테이블로 바로 착석할 수 있습니다.</p>
                            <div className="flex flex-wrap gap-1">
                              {manualMergePrompt.alternativeTables.slice(0, 4).map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    handleSeatAtAlternativeTable(table.id, manualMergePrompt.reservationId, t.id, t.label)
                                  }}
                                  className="text-[12px] font-medium px-1.5 py-0.5 rounded-md bg-cream hover:bg-primary/10 text-charcoal border border-border transition-colors"
                                >
                                  {t.label} · {t.seats}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-[12px] text-charcoal-lighter mt-1">
                          {manualMergePrompt && !manualMergePrompt.localMergePossible
                            ? '현재 구역에서는 연속 병합으로도 필요 좌석을 채울 수 없습니다.'
                            : '붙어있는 빈 테이블이 없거나 연속 선택이 불가능합니다.'}
                        </p>
                        {manualMergePrompt && manualMergePrompt.alternativeTables.length > 0 ? (
                          <div className="mt-2">
                            <p className="text-[12px] text-charcoal-lighter mb-1">대신 바로 착석 가능한 빈 테이블:</p>
                            <div className="flex flex-wrap gap-1">
                              {manualMergePrompt.alternativeTables.slice(0, 4).map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    handleSeatAtAlternativeTable(table.id, manualMergePrompt.reservationId, t.id, t.label)
                                  }}
                                  className="text-[12px] font-medium px-1.5 py-0.5 rounded-md bg-cream hover:bg-primary/10 text-charcoal border border-border transition-colors"
                                >
                                  {t.label} · {t.seats}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[12px] text-charcoal-lighter mt-1">현재는 수용 가능한 빈 테이블도 없습니다.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <ReservedTableActionSection
                table={table}
                linkedReservation={linkedReservation ?? null}
                onSeat={() => {
                  if (!linkedReservation) return
                  seatReservation(linkedReservation.id, table.id)
                  resetSubState()
                }}
              />
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
