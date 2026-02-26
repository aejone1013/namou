import { useState, useEffect } from 'react'
import {
  Users, Clock, Info, Settings,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { useToastStore } from '@/store/useToastStore'
import { toastActions, toastMessages } from '@/features/toast/toastPresets'
import { compareTableLabel, getMergeGroup, getMergeLabel, getTableNumber, isContiguousRange } from '@/data/dummy'
import { planAdjacentMerge } from '@/store/mergePlanner'
import AvailableTableActions from './control-panel/AvailableTableActions'
import NextBookingSection from './control-panel/NextBookingSection'
import OccupiedMoveClearActions from './control-panel/OccupiedMoveClearActions'
import ReservedTableActionSection from './control-panel/ReservedTableActionSection'
import TableEditPanel from './TableEditPanel'

export default function ControlPanel() {
  const store = useReservationStore()
  const {
    focusedTableId,
    reservations,
    isEditMode,
    activeSession,
    toggleEditMode,
    resetReservations,
    resetSetup,
    clearTable,
    walkInTable,
    moveToTable,
    seatReservation,
    seatWithSelectedMerge,
    setNextBooking,
    clearNextBooking,
    setNextBookingTargetLabel,
    saveUndoSnapshot,
    setMergePreviewTableIds,
    undo,
  } = store
  const toast = useToastStore()

  const effectiveTables = store.getEffectiveTables()
  const table = focusedTableId ? effectiveTables.find((t) => t.id === focusedTableId) ?? null : null

  const [showWalkIn, setShowWalkIn] = useState(false)
  const [walkInSize, setWalkInSize] = useState(2)
  const [walkInName, setWalkInName] = useState('')
  const [showMoveSelect, setShowMoveSelect] = useState(false)
  const [showNextBookingSelect, setShowNextBookingSelect] = useState(false)
  const [selectedMergeTableIds, setSelectedMergeTableIds] = useState<string[]>([])
  const [pendingSeatMergeReservationId, setPendingSeatMergeReservationId] = useState<string | null>(null)

  const resetSubState = () => {
    setShowWalkIn(false)
    setWalkInSize(2)
    setWalkInName('')
    setShowMoveSelect(false)
    setShowNextBookingSelect(false)
    setSelectedMergeTableIds([])
    setPendingSeatMergeReservationId(null)
  }

  useEffect(() => {
    resetSubState()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedTableId])

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

  // Filter waiting reservations by active session
  const waitingReservations = table
    ? reservations.filter(
        (r) => r.status === 'waiting' && r.period === activeSession
      )
    : []

  const waitingReservationsForNextBooking = (() => {
    if (!table || table.status !== 'occupied') return []

    const baseTableIds = new Set(store.tables.map((t) => t.id))
    const isBaseTable = baseTableIds.has(table.id)
    const baseNum = getTableNumber(table.label)
    const group = getMergeGroup(baseNum)

    return reservations.filter((r) => {
      if (r.status !== 'waiting' || r.period !== activeSession) return false
      if (r.partySize <= table.seats) return true
      if (!isBaseTable) return false

      const candidates = effectiveTables
        .filter((t) => t.id !== table.id)
        .filter((t) => baseTableIds.has(t.id))
        .filter((t) => t.status === 'available')
        .filter((t) => {
          const num = getTableNumber(t.label)
          return group ? group.includes(num) : true
        })
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
    walkInTable(table.id, walkInSize, walkInName.trim() || undefined)
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
    if (table.nextBooking) {
      if (!window.confirm(`다음 예약 (${table.nextBooking.name}, ${table.nextBooking.partySize}명)이 자동 착석됩니다. 계속하시겠습니까?`)) return
    }
    saveUndoSnapshot('테이블 비우기')
    clearTable(table.id)
    toast.show(toastMessages.tableCleared, 'info', toastActions.undo(() => undo()))
    resetSubState()
  }

  const manualMergePrompt = (() => {
    if (!table || table.status !== 'available' || !table.nextBooking) return null
    if (table.nextBooking.partySize <= table.seats) return null

    const baseNum = getTableNumber(table.label)
    const group = getMergeGroup(baseNum)
    const baseTableIds = new Set(store.tables.map((t) => t.id))
    const allAdjacentCandidates = effectiveTables
      .filter((t) => t.id !== table.id)
      .filter((t) => baseTableIds.has(t.id))
      .filter((t) => t.status === 'available')
      .filter((t) => {
        const num = getTableNumber(t.label)
        return group ? group.includes(num) : true
      })
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
        const aInGroup = group ? group.includes(aNum) : false
        const bInGroup = group ? group.includes(bNum) : false
        if (aInGroup !== bInGroup) return aInGroup ? -1 : 1
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
    if (!window.confirm(`다른 빈 테이블(${targetLabel})로 바로 착석 처리할까요?`)) return
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
    const group = getMergeGroup(baseNum)
    const baseTableIds = new Set(store.tables.map((t) => t.id))
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
    <aside className="w-[232px] min-w-[232px] h-full bg-surface border-l border-border flex flex-col overflow-y-auto">
      {/* Section 1: Settings (always visible) */}
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center gap-1.5 mb-2">
          <Settings size={12} className="text-charcoal-lighter" />
          <span className="text-[11px] font-semibold text-charcoal-light uppercase tracking-wide">설정</span>
        </div>

        <div className="grid grid-cols-3 gap-0.5 rounded-xl bg-cream p-0.5 border border-border">
          <button
            onClick={toggleEditMode}
            className={cn(
              'w-full inline-flex items-center justify-center px-2 py-1.5 rounded-[10px]',
              'text-[11px] font-medium transition-colors',
              isEditMode
                ? 'bg-primary text-white hover:bg-primary-dark shadow-sm'
                : 'bg-transparent text-charcoal hover:bg-surface'
            )}
            title={isEditMode ? '편집 완료' : '배치 편집'}
          >
            <span className="whitespace-nowrap">{isEditMode ? '편집 완료' : '배치 편집'}</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('모든 예약을 초기화하시겠습니까? 테이블 배치는 유지됩니다.')) {
                saveUndoSnapshot('예약 초기화')
                resetReservations()
                toast.show(toastMessages.reservationsReset, 'info', toastActions.undo(() => undo()))
              }
            }}
            className="w-full inline-flex items-center justify-center px-2 py-1.5 rounded-[10px] text-[11px] font-medium bg-transparent text-charcoal hover:bg-surface transition-colors"
            title="예약 초기화"
          >
            <span className="whitespace-nowrap">예약 초기화</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('설정을 초기화하시겠습니까? 모든 예약과 배치가 삭제됩니다.')) {
                saveUndoSnapshot('설정 초기화')
                resetSetup()
                toast.show(toastMessages.settingsReset, 'info', toastActions.undo(() => undo()))
              }
            }}
            className="w-full inline-flex items-center justify-center px-2 py-1.5 rounded-[10px] text-[11px] font-medium bg-transparent text-charcoal-light hover:text-occupied hover:bg-occupied-light transition-colors"
            title="설정 초기화"
          >
            <span className="whitespace-nowrap">설정 초기화</span>
          </button>
        </div>
      </div>

      {/* Section 2: TableEditPanel (edit mode) */}
      {isEditMode && (
        <div className="border-t border-border overflow-y-auto flex-1">
          <TableEditPanel />
        </div>
      )}

      {/* Section 2: Table Detail (normal mode) */}
      {!isEditMode && (
        <div className="flex-1 px-3 py-3">
          {!table ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-8">
              <div className="w-10 h-10 rounded-2xl bg-cream flex items-center justify-center">
                <Info size={18} className="text-charcoal-lighter" />
              </div>
              <p className="text-[10px] text-charcoal-lighter leading-snug">
                테이블 선택 시<br />상세 정보 표시
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table header */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-[13px] font-bold text-charcoal">{table.label}</span>
                <div className="flex items-center gap-1 text-[11px] text-charcoal-lighter">
                  <Users size={12} />
                  {table.seats}인석
                </div>
              </div>

              {/* Occupied + reservation linked */}
              {table.status === 'occupied' && linkedReservation && (
                <div className="space-y-2">
                  <div className="text-[11px] space-y-1">
                    <p className="font-medium text-charcoal">
                      {linkedReservation.name}
                      <span className="text-charcoal-lighter ml-1">({linkedReservation.partySize}명)</span>
                    </p>
                    <div className="flex items-center gap-1 text-charcoal-lighter">
                      <Clock size={11} />
                      {linkedReservation.startTime} ~ {linkedReservation.endTime}
                    </div>
                  </div>

                  <OccupiedMoveClearActions
                    showMoveSelect={showMoveSelect}
                    availableForMove={availableForMove}
                    onMove={handleMove}
                    onShowMoveSelect={() => setShowMoveSelect(true)}
                    onCancelMoveSelect={() => setShowMoveSelect(false)}
                    onClear={handleClearFocusedTable}
                  />
                </div>
              )}

              {/* Occupied + walk-in */}
              {table.status === 'occupied' && !linkedReservation && (
                <div className="space-y-2">
                  <div className="text-[11px] text-charcoal py-0.5">
                    {table.currentTeam
                      ? (
                        <>
                          <span className="font-medium">{table.currentTeam.name}</span>{' '}
                          <span className="text-charcoal-lighter">({table.currentTeam.partySize}명 · {table.currentTeam.seatedAt}~)</span>
                        </>
                      )
                      : '사용중'}
                  </div>

                  <OccupiedMoveClearActions
                    showMoveSelect={showMoveSelect}
                    availableForMove={availableForMove}
                    onMove={handleMove}
                    onShowMoveSelect={() => setShowMoveSelect(true)}
                    onCancelMoveSelect={() => setShowMoveSelect(false)}
                    onClear={handleClearFocusedTable}
                  />
                </div>
              )}

              <NextBookingSection
                table={table}
                waitingReservations={waitingReservationsForNextBooking}
                showNextBookingSelect={showNextBookingSelect}
                setShowNextBookingSelect={setShowNextBookingSelect}
                onSetNextBooking={setNextBooking}
                onClearNextBooking={clearNextBooking}
                onSetTargetLabel={setNextBookingTargetLabel}
              />

              {/* Available */}
              <AvailableTableActions
                table={table}
                showWalkIn={showWalkIn}
                setShowWalkIn={setShowWalkIn}
                walkInName={walkInName}
                setWalkInName={setWalkInName}
                walkInSize={walkInSize}
                setWalkInSize={setWalkInSize}
                waitingReservations={waitingReservations}
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
              />

              {table.status === 'available' && pendingSeatMergeReservation && pendingSeatMergeReservation.partySize > table.seats && (
                <div className="border-t border-border pt-2">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-2.5 py-2 space-y-2">
                    <p className="text-[10px] font-medium text-charcoal">
                      {pendingSeatMergeReservation.name}
                      <span className="text-charcoal-lighter ml-1">({pendingSeatMergeReservation.partySize}명)</span>
                    </p>
                    <p className="text-[10px] text-charcoal-lighter">
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
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border bg-cream text-charcoal border-border hover:border-primary/40 hover:bg-primary/10 transition-colors"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-charcoal-lighter">
                        현재 이 테이블 기준으로 가능한 연속 병합 조합이 없습니다.
                      </p>
                    )}

                    <button
                      onClick={() => setPendingSeatMergeReservationId(null)}
                      className="text-[10px] text-charcoal-lighter hover:text-charcoal transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              {table.status === 'available' && table.nextBooking && table.nextBooking.partySize > table.seats && (
                <div className="border-t border-border pt-2">
                  <div className="rounded-xl border border-reserved/20 bg-reserved/8 px-2.5 py-2">
                    <p className="text-[10px] font-medium text-charcoal">다음 예약 인원({table.nextBooking.partySize}명)이 현재 테이블 좌석({table.seats})을 초과합니다.</p>
                    {manualMergePrompt && manualMergePrompt.candidates.length > 0 ? (
                      <>
                        <p className="text-[10px] text-charcoal-lighter mt-1">병합할 테이블을 선택해주세요.</p>
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
                                  'text-[10px] font-medium px-1.5 py-0.5 rounded-md border transition-colors',
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
                          'mt-1 text-[10px]',
                          manualMergePrompt.hasEnoughSeats ? 'text-available' : 'text-charcoal-lighter'
                        )}>
                          선택 좌석: {manualMergePrompt.selectedSeats} / 필요 좌석: {manualMergePrompt.requiredSeats}
                        </p>
                        {manualMergePrompt.selectedIds.length > 0 && (
                          <p className="mt-1 text-[10px] text-charcoal-lighter">
                            병합 결과: <span className="text-charcoal font-medium">{getMergeLabel(manualMergePrompt.selectedNums)}</span>
                          </p>
                        )}
                        {manualMergePrompt.hasEnoughSeats && (
                          <p className="mt-1 text-[10px] text-available">필요 좌석을 충족했습니다. 추가 선택은 잠깁니다(선택 해제는 가능).</p>
                        )}
                        {!manualMergePrompt.isContiguousSelection && (
                          <p className="mt-1 text-[10px] text-occupied">연속된 테이블만 함께 병합할 수 있습니다.</p>
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
                          className="mt-2 w-full inline-flex items-center justify-center text-[10px] font-medium py-1.5 rounded-lg text-reserved bg-reserved/15 hover:bg-reserved/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          선택 병합으로 착석
                        </button>

                        {manualMergePrompt.alternativeTables.length > 0 && !manualMergePrompt.canSeat && (
                          <div className="mt-2 pt-2 border-t border-reserved/20">
                            <p className="text-[10px] text-charcoal-lighter mb-1">옆 테이블 병합이 안 되면, 아래 빈 테이블로 바로 착석할 수 있습니다.</p>
                            <div className="flex flex-wrap gap-1">
                              {manualMergePrompt.alternativeTables.slice(0, 4).map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    handleSeatAtAlternativeTable(table.id, manualMergePrompt.reservationId, t.id, t.label)
                                  }}
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-cream hover:bg-primary/10 text-charcoal border border-border transition-colors"
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
                        <p className="text-[10px] text-charcoal-lighter mt-1">
                          {manualMergePrompt && !manualMergePrompt.localMergePossible
                            ? '현재 구역에서는 연속 병합으로도 필요 좌석을 채울 수 없습니다.'
                            : '붙어있는 빈 테이블이 없거나 연속 선택이 불가능합니다.'}
                        </p>
                        {manualMergePrompt && manualMergePrompt.alternativeTables.length > 0 ? (
                          <div className="mt-2">
                            <p className="text-[10px] text-charcoal-lighter mb-1">대신 바로 착석 가능한 빈 테이블:</p>
                            <div className="flex flex-wrap gap-1">
                              {manualMergePrompt.alternativeTables.slice(0, 4).map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    handleSeatAtAlternativeTable(table.id, manualMergePrompt.reservationId, t.id, t.label)
                                  }}
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-cream hover:bg-primary/10 text-charcoal border border-border transition-colors"
                                >
                                  {t.label} · {t.seats}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-charcoal-lighter mt-1">현재는 수용 가능한 빈 테이블도 없습니다.</p>
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
