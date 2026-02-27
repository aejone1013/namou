import { useState } from 'react'
import { Users, MessageSquare, Phone, Trash2, Armchair, Pencil, Sun, Moon, CheckCircle, Clock3 } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Reservation } from '@/data/dummy'
import { compareTableLabel, getMergeGroup, getMergeLabel, getTableNumber } from '@/data/dummy'
import { useReservationStore } from '@/store/useReservationStore'
import { useToastStore } from '@/store/useToastStore'
import { toastActions } from '@/features/toast/toastPresets'
import { planAdjacentMerge } from '@/store/mergePlanner'
import { reservationOverlapsBooking } from '@/store/plannedBookingPolicies'

interface ReservationCardProps {
  reservation: Reservation
}

const statusConfig = {
  waiting: {
    bg: 'bg-primary/10',
    text: 'text-primary-dark',
    label: '대기중',
    dot: 'bg-primary',
    icon: Clock3,
  },
  seated: {
    bg: 'bg-available-light',
    text: 'text-green-700',
    label: '착석',
    dot: 'bg-available',
    icon: Armchair,
  },
  completed: {
    bg: 'bg-charcoal-lighter/10',
    text: 'text-charcoal-lighter',
    label: '완료',
    dot: 'bg-charcoal-lighter',
    icon: CheckCircle,
  },
}

export default function ReservationCard({ reservation }: ReservationCardProps) {
  const store = useReservationStore()
  const {
    removeReservation,
    seatReservation,
    seatWithSelectedMerge,
    openModal,
    clearTable,
    clearNextBookingByReservation,
    setNextBooking,
    setNextBookingMulti,
    saveUndoSnapshot,
    undo,
  } = store
  const toast = useToastStore()
  const config = statusConfig[reservation.status]
  const StatusIcon = config.icon
  const [showTableSelect, setShowTableSelect] = useState(false)
  const [showChangeSelect, setShowChangeSelect] = useState(false)
  const [showAssignSelect, setShowAssignSelect] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const effectiveTables = store.getEffectiveTables()
  const sessionData = store.sessionData[store.activeSession]
  const baseTableIds = new Set(store.tables.map((t) => t.id))
  const baseTableById = new Map(store.tables.map((t) => [t.id, t] as const))
  const getScopeTableIdsForMergeLabel = (baseTableId: string, mergeLabel: string): string[] => {
    const match = mergeLabel.match(/^T(\d+)-(\d+)$/)
    if (!match) return [baseTableId]
    const start = parseInt(match[1], 10)
    const end = parseInt(match[2], 10)
    const min = Math.min(start, end)
    const max = Math.max(start, end)
    return store.tables
      .filter((t) => {
        const num = getTableNumber(t.label)
        return num >= min && num <= max
      })
      .sort((a, b) => compareTableLabel(a.label, b.label))
      .map((t) => t.id)
  }
  const getPlannedBookings = (tableId: string) => {
    const ts = sessionData.tableStates[tableId]
    if (!ts) return []
    return ts.plannedBookings ?? (ts.nextBooking ? [ts.nextBooking] : [])
  }

  // Table where this reservation is seated
  const seatedTable = effectiveTables.find((t) => t.currentTeam?.reservationId === reservation.id)

  const assignedEntries =
    reservation.status === 'waiting'
      ? Object.entries(sessionData.tableStates)
        .flatMap(([tableId, ts]) => {
          const planned = ts.plannedBookings ?? (ts.nextBooking ? [ts.nextBooking] : [])
          return planned
            .filter((b) => b.reservationId === reservation.id)
            .map((b) => ({ tableId, nextBooking: b }))
        })
      : []
  const assignedSourceIds = assignedEntries.map((e) => e.tableId)
  const assignedPrimarySourceId = assignedSourceIds[0] ?? null
  const assignedPrimaryVisibleTable =
    assignedPrimarySourceId ? effectiveTables.find((t) => t.id === assignedPrimarySourceId) ?? null : null
  const assignedMergeLabel = assignedEntries[0]?.nextBooking.targetLabel
  const assignedDisplayLabel = (() => {
    const firstBooking = assignedEntries[0]?.nextBooking
    if (firstBooking?.scopeTableIds && firstBooking.scopeTableIds.length > 0) {
      const nums = firstBooking.scopeTableIds
        .map((id) => baseTableById.get(id)?.label)
        .filter(Boolean)
        .map((label) => getTableNumber(label!))
        .sort((a, b) => a - b)
      if (nums.length > 0) return nums.length === 1 ? `T${nums[0]}` : getMergeLabel(nums)
    }
    if (assignedMergeLabel) return assignedMergeLabel
    if (assignedSourceIds.length === 0) return null
    const nums = assignedSourceIds
      .map((id) => baseTableById.get(id)?.label)
      .filter(Boolean)
      .map((label) => getTableNumber(label!))
      .sort((a, b) => a - b)
    if (nums.length === 0) return assignedPrimaryVisibleTable?.label ?? null
    return nums.length === 1 ? `T${nums[0]}` : getMergeLabel(nums)
  })()
  const hasAssignedBooking = assignedEntries.length > 0

  const availableTables = [...effectiveTables.filter(
    (t) => t.status === 'available' && t.seats >= reservation.partySize
  )].sort((a, b) => compareTableLabel(a.label, b.label))

  const mergeSeatOptions = [...effectiveTables
    .filter((t) => t.status === 'available')
    .filter((t) => baseTableIds.has(t.id))
    .filter((t) => t.seats < reservation.partySize)
    .map((target) => {
      const baseNum = getTableNumber(target.label)
      const group = getMergeGroup(baseNum)
      const candidates = effectiveTables
        .filter((t) => t.id !== target.id)
        .filter((t) => baseTableIds.has(t.id))
        .filter((t) => t.status === 'available')
        .filter((t) => {
          const num = getTableNumber(t.label)
          return group ? group.includes(num) : true
        })
        .map((t) => ({ id: t.id, num: getTableNumber(t.label), seats: t.seats }))

      const mergePlan = planAdjacentMerge(baseNum, target.seats, reservation.partySize, candidates)
      if (!mergePlan) return null

      return {
        baseTableId: target.id,
        baseLabel: target.label,
        mergeTableIds: mergePlan.selectedIds,
        mergeLabel: getMergeLabel(mergePlan.selectedNums),
        totalSeats: target.seats + candidates
          .filter((c) => mergePlan.selectedIds.includes(c.id))
          .reduce((sum, c) => sum + c.seats, 0),
      }
    })
    .filter((v): v is NonNullable<typeof v> => !!v)
  ]
    .reduce<typeof effectiveTables extends never ? never : Array<{
      baseTableId: string
      baseLabel: string
      mergeTableIds: string[]
      mergeLabel: string
      totalSeats: number
    }>>((acc, option) => {
      if (acc.some((existing) => existing.mergeLabel === option.mergeLabel)) return acc
      acc.push(option)
      return acc
    }, [])
    .sort((a, b) => {
    if (a.totalSeats !== b.totalSeats) return a.totalSeats - b.totalSeats
    return compareTableLabel(a.baseLabel, b.baseLabel)
  })

  const canHostByMerge = (targetTableId: string) => {
    const target = effectiveTables.find((t) => t.id === targetTableId)
    if (!target) return false
    if (!baseTableIds.has(target.id)) return false
    if (reservation.partySize <= target.seats) return true

    const baseNum = getTableNumber(target.label)
    const group = getMergeGroup(baseNum)
    const candidates = effectiveTables
      .filter((t) => t.id !== target.id)
      .filter((t) => baseTableIds.has(t.id))
      .filter((t) => t.status === 'available')
      .filter((t) => {
        const num = getTableNumber(t.label)
        return group ? group.includes(num) : true
      })
      .map((t) => ({ id: t.id, num: getTableNumber(t.label), seats: t.seats }))

    return !!planAdjacentMerge(baseNum, target.seats, reservation.partySize, candidates)
  }

  const reassignableTables = [...effectiveTables.filter((t) => {
    if (assignedSourceIds.includes(t.id)) return false
    const planned = getPlannedBookings(t.id)
    if (planned.some((b) => b.reservationId !== reservation.id && reservationOverlapsBooking(reservation, b))) return false
    if (!(t.status === 'occupied' || t.status === 'available')) return false
    if (t.seats >= reservation.partySize) return true
    // For larger parties, also allow base tables that can be handled by future merge.
    return canHostByMerge(t.id)
  })].sort((a, b) => compareTableLabel(a.label, b.label))

  const assignDirectTables = reassignableTables.filter((t) => t.seats >= reservation.partySize)

  const assignMergeOptions = reassignableTables
    .filter((t) => t.seats < reservation.partySize)
    .filter((t) => baseTableIds.has(t.id))
    .map((target) => {
      const baseNum = getTableNumber(target.label)
      const group = getMergeGroup(baseNum)
      const candidates = effectiveTables
        .filter((t) => t.id !== target.id)
        .filter((t) => baseTableIds.has(t.id))
        .filter((t) => t.status === 'available')
        .filter((t) => {
          const num = getTableNumber(t.label)
          return group ? group.includes(num) : true
        })
        .map((t) => ({ id: t.id, num: getTableNumber(t.label), seats: t.seats }))

      const mergePlan = planAdjacentMerge(baseNum, target.seats, reservation.partySize, candidates)
      if (!mergePlan) return null

      return {
        baseTableId: target.id,
        baseLabel: target.label,
        baseStatus: target.status as 'available' | 'occupied',
        mergeTableIds: mergePlan.selectedIds,
        mergeLabel: getMergeLabel(mergePlan.selectedNums),
        totalSeats: target.seats + candidates
          .filter((c) => mergePlan.selectedIds.includes(c.id))
          .reduce((sum, c) => sum + c.seats, 0),
      }
    })
    .filter((v): v is NonNullable<typeof v> => !!v)
    .reduce<Array<{
      baseTableId: string
      baseLabel: string
      baseStatus: 'available' | 'occupied'
      mergeTableIds: string[]
      mergeLabel: string
      totalSeats: number
    }>>((acc, option) => {
      if (acc.some((e) => e.mergeLabel === option.mergeLabel && e.baseStatus === option.baseStatus)) return acc
      acc.push(option)
      return acc
    }, [])
    .sort((a, b) => {
      if (a.totalSeats !== b.totalSeats) return a.totalSeats - b.totalSeats
      return compareTableLabel(a.baseLabel, b.baseLabel)
    })

  const occupiedMergedAssignOptions = effectiveTables
    .filter((t) => t.status === 'occupied' && !!t.mergedFrom && t.mergedFrom.length >= 2)
    .flatMap((merged) => {
      const origins = [...(merged.mergedFrom ?? [])].sort((a, b) => compareTableLabel(a.label, b.label))
      const options: Array<{ tableIds: string[]; mergeLabel: string; totalSeats: number; hostLabel: string }> = []
      for (let start = 0; start < origins.length; start++) {
        let seats = 0
        const ids: string[] = []
        const nums: number[] = []
        for (let end = start; end < origins.length; end++) {
          const origin = origins[end]
          const originState = sessionData.tableStates[origin.id]
          const existingPlanned = originState ? (originState.plannedBookings ?? (originState.nextBooking ? [originState.nextBooking] : [])) : []
          if (existingPlanned.some((b) => b.reservationId !== reservation.id && reservationOverlapsBooking(reservation, b))) break

          ids.push(origin.id)
          nums.push(getTableNumber(origin.label))
          seats += origin.seats

          if (seats >= reservation.partySize) {
            options.push({
              tableIds: [...ids],
              mergeLabel: getMergeLabel(nums),
              totalSeats: seats,
              hostLabel: merged.label,
            })
            break
          }
        }
      }
      if (options.length === 0) return []
      const minSeats = Math.min(...options.map((o) => o.totalSeats))
      return options.filter((o) => o.totalSeats === minSeats)
    })
    .reduce<Array<{ tableIds: string[]; mergeLabel: string; totalSeats: number; hostLabel: string }>>((acc, option) => {
      if (acc.some((o) => o.mergeLabel === option.mergeLabel)) return acc
      acc.push(option)
      return acc
    }, [])
    .sort((a, b) => {
      if (a.totalSeats !== b.totalSeats) return a.totalSeats - b.totalSeats
      return compareTableLabel(a.mergeLabel, b.mergeLabel)
    })

  const handleSeatAtTable = (tableId: string) => {
    if (hasAssignedBooking) clearNextBookingByReservation(reservation.id)
    seatReservation(reservation.id, tableId)
    setShowTableSelect(false)
  }

  const handleSeatWithMergeOption = (baseTableId: string, mergeTableIds: string[]) => {
    if (hasAssignedBooking) clearNextBookingByReservation(reservation.id)
    seatWithSelectedMerge(reservation.id, baseTableId, mergeTableIds)
    setShowTableSelect(false)
  }

  const handleChangeAssignment = (newTableId: string) => {
    if (hasAssignedBooking) clearNextBookingByReservation(reservation.id)
    setNextBooking(newTableId, reservation.id)
    setShowChangeSelect(false)
  }

  const handleChangeAssignmentWithMerge = (tableId: string, mergeLabel: string) => {
    if (hasAssignedBooking) clearNextBookingByReservation(reservation.id)
    setNextBookingMulti(getScopeTableIdsForMergeLabel(tableId, mergeLabel), reservation.id, mergeLabel)
    setShowChangeSelect(false)
  }

  const handleChangeAssignmentOnScope = (tableIds: string[], mergeLabel: string) => {
    if (hasAssignedBooking) clearNextBookingByReservation(reservation.id)
    setNextBookingMulti(tableIds, reservation.id, mergeLabel)
    setShowChangeSelect(false)
  }

  const handleAssignNextBooking = (tableId: string) => {
    setNextBooking(tableId, reservation.id)
    setShowAssignSelect(false)
  }

  const handleAssignNextBookingWithMerge = (tableId: string, mergeLabel: string) => {
    setNextBookingMulti(getScopeTableIdsForMergeLabel(tableId, mergeLabel), reservation.id, mergeLabel)
    setShowAssignSelect(false)
  }

  const handleAssignNextBookingOnScope = (tableIds: string[], mergeLabel: string) => {
    setNextBookingMulti(tableIds, reservation.id, mergeLabel)
    setShowAssignSelect(false)
  }

  const handleComplete = () => {
    if (!seatedTable) return
    const collectAutoSeatCandidates = () => {
      const tableStates = sessionData.tableStates
      const buckets = [
        ...(tableStates[seatedTable.id]?.plannedBookings ?? (tableStates[seatedTable.id]?.nextBooking ? [tableStates[seatedTable.id].nextBooking!] : [])),
      ]
      if (seatedTable.mergedFrom && seatedTable.mergedFrom.length >= 2) {
        for (const origin of seatedTable.mergedFrom) {
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
    clearTable(seatedTable.id)
    toast.show(`${seatedTable.label} 테이블을 비웠습니다.`, 'info', toastActions.undo(() => undo()))
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
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="font-semibold text-charcoal text-sm min-w-0 truncate">
          {reservation.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Seated table badge */}
          {reservation.status === 'seated' && seatedTable && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
              {seatedTable.label}
            </span>
          )}
          {/* Assigned (nextBooking) table badge */}
          {reservation.status === 'waiting' && hasAssignedBooking && (
            <span className="text-[10px] font-bold text-reserved bg-reserved/10 px-1.5 py-0.5 rounded-md">
              {(assignedDisplayLabel ?? '배정')} 배정
            </span>
          )}
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full',
              config.bg, config.text
            )}
          >
            <StatusIcon size={11} />
            <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
            {config.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-charcoal-light text-xs min-w-0">
        <span className="inline-flex items-center gap-1 min-w-0">
          {reservation.period === 'lunch' ? (
            <Sun size={11} className="text-yellow-600" />
          ) : (
            <Moon size={11} className="text-indigo-400" />
          )}
          <span className="truncate">{reservation.startTime}~{reservation.endTime}</span>
        </span>
        <span className="inline-flex items-center gap-1 shrink-0">
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
        <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-primary-dark bg-primary/5 rounded-xl px-2.5 py-1.5 min-w-0">
          <MessageSquare size={11} className="mt-0.5 shrink-0" />
          <span className="break-words">{reservation.note}</span>
        </div>
      )}

      {/* 테이블 선택 패널 (착석) */}
      {showTableSelect && (
        <div className="mt-2.5 pt-2.5 border-t border-border">
          <p className="text-[11px] text-charcoal-lighter mb-1.5">테이블 선택:</p>
          {availableTables.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {availableTables.map((t) => (
                <button key={t.id} onClick={() => handleSeatAtTable(t.id)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-cream hover:bg-primary/10 text-charcoal border border-border hover:border-primary/30 transition-colors"
                >
                  {t.label} ({t.seats}석)
                </button>
              ))}
            </div>
          )}
          {mergeSeatOptions.length > 0 && (
            <div className={cn('space-y-1.5', availableTables.length > 0 && 'mt-2')}>
              <p className="text-[10px] text-charcoal-lighter">병합 가능 조합:</p>
              <div className="flex flex-wrap gap-1.5">
                {mergeSeatOptions.map((option) => (
                  <button
                    key={`${option.baseTableId}-${option.mergeLabel}`}
                    onClick={() => handleSeatWithMergeOption(option.baseTableId, option.mergeTableIds)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-primary/5 hover:bg-primary/10 text-charcoal border border-primary/20 hover:border-primary/35 transition-colors"
                  >
                    {option.mergeLabel}
                  </button>
                ))}
              </div>
            </div>
          )}
          {availableTables.length === 0 && mergeSeatOptions.length === 0 && (
            <p className="text-[11px] text-charcoal-lighter">착석 가능한 테이블이 없습니다</p>
          )}
          <button onClick={() => setShowTableSelect(false)} className="text-[10px] text-charcoal-lighter mt-1.5 hover:text-charcoal">취소</button>
        </div>
      )}

      {/* 테이블 변경 패널 (nextBooking 재배정) */}
      {showChangeSelect && (
        <div className="mt-2.5 pt-2.5 border-t border-border">
          <p className="text-[11px] text-charcoal-lighter mb-1.5">변경할 테이블:</p>
          {assignDirectTables.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {assignDirectTables.map((t) => (
                <button key={t.id} onClick={() => handleChangeAssignment(t.id)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-cream hover:bg-reserved/10 text-charcoal border border-border hover:border-reserved/30 transition-colors"
                >
                  {t.label}
                  <span className="ml-1 text-[10px] text-charcoal-lighter">
                    {t.status === 'occupied' ? '사용중' : '빈'}
                  </span>
                </button>
              ))}
            </div>
          )}
          {assignMergeOptions.length > 0 && (
            <div className={cn('space-y-1.5', assignDirectTables.length > 0 && 'mt-2')}>
              <p className="text-[10px] text-charcoal-lighter">병합 가능 조합:</p>
              <div className="flex flex-wrap gap-1.5">
                {assignMergeOptions.map((option) => (
                  <button
                    key={`change-${option.baseTableId}-${option.mergeLabel}-${option.baseStatus}`}
                    onClick={() => handleChangeAssignmentWithMerge(option.baseTableId, option.mergeLabel)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-reserved/5 hover:bg-reserved/10 text-charcoal border border-reserved/20 hover:border-reserved/35 transition-colors"
                  >
                    {option.mergeLabel}
                    <span className="ml-1 text-[10px] text-charcoal-lighter">
                      {option.baseStatus === 'occupied' ? '사용중' : '빈'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {occupiedMergedAssignOptions.length > 0 && (
            <div className={cn('space-y-1.5', (assignDirectTables.length > 0 || assignMergeOptions.length > 0) && 'mt-2')}>
              <p className="text-[10px] text-charcoal-lighter">사용중 병합 테이블 내 예약 배정:</p>
              <div className="flex flex-wrap gap-1.5">
                {occupiedMergedAssignOptions.map((option) => (
                  <button
                    key={`change-scope-${option.mergeLabel}`}
                    onClick={() => handleChangeAssignmentOnScope(option.tableIds, option.mergeLabel)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-reserved/5 hover:bg-reserved/10 text-charcoal border border-reserved/20 hover:border-reserved/35 transition-colors"
                  >
                    {option.mergeLabel}
                    <span className="ml-1 text-[10px] text-charcoal-lighter">{option.hostLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {assignDirectTables.length === 0 && assignMergeOptions.length === 0 && occupiedMergedAssignOptions.length === 0 && (
            <p className="text-[11px] text-charcoal-lighter">이동 가능한 테이블 없음</p>
          )}
          <button onClick={() => setShowChangeSelect(false)} className="text-[10px] text-charcoal-lighter mt-1.5 hover:text-charcoal">취소</button>
        </div>
      )}

      {/* 테이블 배정 패널 (nextBooking 신규 배정) */}
      {showAssignSelect && (
        <div className="mt-2.5 pt-2.5 border-t border-border">
          <p className="text-[11px] text-charcoal-lighter mb-1.5">예약 배정할 테이블:</p>
          {assignDirectTables.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {assignDirectTables.map((t) => (
                <button key={t.id} onClick={() => handleAssignNextBooking(t.id)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-cream hover:bg-reserved/10 text-charcoal border border-border hover:border-reserved/30 transition-colors"
                >
                  {t.label}
                  <span className="ml-1 text-[10px] text-charcoal-lighter">
                    {t.status === 'occupied' ? '사용중' : '빈'}
                  </span>
                </button>
              ))}
            </div>
          )}
          {assignMergeOptions.length > 0 && (
            <div className={cn('space-y-1.5', assignDirectTables.length > 0 && 'mt-2')}>
              <p className="text-[10px] text-charcoal-lighter">병합 가능 조합:</p>
              <div className="flex flex-wrap gap-1.5">
                {assignMergeOptions.map((option) => (
                  <button
                    key={`${option.baseTableId}-${option.mergeLabel}-${option.baseStatus}`}
                    onClick={() => handleAssignNextBookingWithMerge(option.baseTableId, option.mergeLabel)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-reserved/5 hover:bg-reserved/10 text-charcoal border border-reserved/20 hover:border-reserved/35 transition-colors"
                  >
                    {option.mergeLabel}
                    <span className="ml-1 text-[10px] text-charcoal-lighter">
                      {option.baseStatus === 'occupied' ? '사용중' : '빈'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {occupiedMergedAssignOptions.length > 0 && (
            <div className={cn('space-y-1.5', (assignDirectTables.length > 0 || assignMergeOptions.length > 0) && 'mt-2')}>
              <p className="text-[10px] text-charcoal-lighter">사용중 병합 테이블 내 예약 배정:</p>
              <div className="flex flex-wrap gap-1.5">
                {occupiedMergedAssignOptions.map((option) => (
                  <button
                    key={`assign-scope-${option.mergeLabel}`}
                    onClick={() => handleAssignNextBookingOnScope(option.tableIds, option.mergeLabel)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-reserved/5 hover:bg-reserved/10 text-charcoal border border-reserved/20 hover:border-reserved/35 transition-colors"
                  >
                    {option.mergeLabel}
                    <span className="ml-1 text-[10px] text-charcoal-lighter">{option.hostLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {assignDirectTables.length === 0 && assignMergeOptions.length === 0 && occupiedMergedAssignOptions.length === 0 && (
            <p className="text-[11px] text-charcoal-lighter">배정 가능한 테이블 없음</p>
          )}
          <button onClick={() => setShowAssignSelect(false)} className="text-[10px] text-charcoal-lighter mt-1.5 hover:text-charcoal">취소</button>
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

      {/* 완료 상태: 삭제 버튼을 상태 뱃지 아래 보조 액션으로 배치 */}
      {!showTableSelect && !showChangeSelect && !showAssignSelect && !showDeleteConfirm && reservation.status === 'completed' && (
        <div className="mt-2 pt-2 border-t border-border flex justify-end">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1 text-[10px] text-charcoal-lighter hover:text-occupied transition-colors"
            title="삭제"
          >
            <Trash2 size={11} />
            삭제
          </button>
        </div>
      )}

      {/* 액션 버튼 */}
      {!showTableSelect && !showChangeSelect && !showAssignSelect && !showDeleteConfirm && reservation.status !== 'completed' && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border">
          {/* Waiting: assigned → change; not assigned + available tables → seat */}
          {reservation.status === 'waiting' && hasAssignedBooking && (
            <>
              {(availableTables.length > 0 || mergeSeatOptions.length > 0) && (
                <button
                  onClick={() => setShowTableSelect(true)}
                  className="flex-1 inline-flex items-center justify-center text-[13px] font-semibold py-2.5 rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors"
                >
                  착석
                </button>
              )}
              <button
                onClick={() => setShowChangeSelect(true)}
                className="flex-1 inline-flex items-center justify-center text-[13px] font-semibold py-2.5 rounded-xl text-reserved bg-reserved/10 hover:bg-reserved/20 transition-colors"
              >
                변경
              </button>
            </>
          )}
          {reservation.status === 'waiting' && !hasAssignedBooking && (
            <>
              {(availableTables.length > 0 || mergeSeatOptions.length > 0) ? (
                <button
                  onClick={() => setShowTableSelect(true)}
                  className="flex-1 inline-flex items-center justify-center text-[13px] font-semibold py-2.5 rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors"
                >
                  착석
                </button>
              ) : (
                <span className="flex-1 text-[11px] text-charcoal-lighter text-center py-1.5">빈 테이블 없음</span>
              )}

              <button
                onClick={() => setShowAssignSelect(true)}
                className="flex-1 inline-flex items-center justify-center text-[13px] font-semibold py-2.5 rounded-xl text-reserved bg-reserved/10 hover:bg-reserved/20 transition-colors"
              >
                예약 배정
              </button>
            </>
          )}

          {/* Seated: complete */}
          {reservation.status === 'seated' && (
            <button
              onClick={handleComplete}
              className="flex-1 inline-flex items-center justify-center gap-1 text-[13px] font-semibold py-2.5 rounded-xl text-white bg-available hover:bg-available/80 transition-colors"
            >
              <CheckCircle size={12} />
              식사 완료
            </button>
          )}

          <button
            onClick={() => openModal(reservation)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-charcoal-lighter hover:text-primary hover:bg-primary/10 transition-colors"
            title="편집"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-charcoal-lighter hover:text-occupied hover:bg-occupied-light transition-colors"
            title="삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
