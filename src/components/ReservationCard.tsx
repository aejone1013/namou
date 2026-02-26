import { useState } from 'react'
import { Users, MessageSquare, Phone, Trash2, Armchair, Pencil, Sun, Moon, CheckCircle, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Reservation } from '@/data/dummy'
import { compareTableLabel, getMergeGroup, getMergeLabel, getTableNumber } from '@/data/dummy'
import { useReservationStore } from '@/store/useReservationStore'
import { useToastStore } from '@/store/useToastStore'
import { toastActions, toastMessages } from '@/features/toast/toastPresets'
import { planAdjacentMerge } from '@/store/mergePlanner'

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
  const store = useReservationStore()
  const {
    removeReservation,
    seatReservation,
    seatWithSelectedMerge,
    openModal,
    clearTable,
    clearNextBooking,
    setNextBooking,
    saveUndoSnapshot,
    undo,
  } = store
  const toast = useToastStore()
  const config = statusConfig[reservation.status]
  const [showTableSelect, setShowTableSelect] = useState(false)
  const [showChangeSelect, setShowChangeSelect] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const effectiveTables = store.getEffectiveTables()
  const baseTableIds = new Set(store.tables.map((t) => t.id))

  // Table where this reservation is seated
  const seatedTable = effectiveTables.find((t) => t.currentTeam?.reservationId === reservation.id)

  // Table that has this reservation as nextBooking (waiting assignment)
  const assignedTable =
    reservation.status === 'waiting'
      ? effectiveTables.find((t) => t.nextBooking?.reservationId === reservation.id)
      : null

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
    if (t.id === assignedTable?.id) return false
    if (!(t.status === 'occupied' || t.status === 'available')) return false
    if (t.seats >= reservation.partySize) return true
    // For larger parties, also allow base tables that can be handled by future merge.
    return canHostByMerge(t.id)
  })].sort((a, b) => compareTableLabel(a.label, b.label))

  const handleSeatAtTable = (tableId: string) => {
    seatReservation(reservation.id, tableId)
    setShowTableSelect(false)
  }

  const handleSeatWithMergeOption = (baseTableId: string, mergeTableIds: string[]) => {
    seatWithSelectedMerge(reservation.id, baseTableId, mergeTableIds)
    setShowTableSelect(false)
  }

  const handleChangeAssignment = (newTableId: string) => {
    if (assignedTable) clearNextBooking(assignedTable.id)
    setNextBooking(newTableId, reservation.id)
    setShowChangeSelect(false)
  }

  const handleComplete = () => {
    if (!seatedTable) return
    if (seatedTable.nextBooking) {
      if (!window.confirm(`다음 예약 (${seatedTable.nextBooking.name}, ${seatedTable.nextBooking.partySize}명)이 자동 착석됩니다. 계속하시겠습니까?`)) return
    }
    saveUndoSnapshot('테이블 비우기')
    clearTable(seatedTable.id)
    toast.show(toastMessages.tableCleared, 'info', toastActions.undo(() => undo()))
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
          {reservation.status === 'waiting' && assignedTable && (
            <span className="text-[10px] font-bold text-reserved bg-reserved/10 px-1.5 py-0.5 rounded-md">
              {assignedTable.label} 배정
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
          <div className="flex flex-wrap gap-1.5">
            {reassignableTables.map((t) => (
              <button key={t.id} onClick={() => handleChangeAssignment(t.id)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-cream hover:bg-reserved/10 text-charcoal border border-border hover:border-reserved/30 transition-colors"
              >
                {t.label}
                <span className="ml-1 text-[10px] text-charcoal-lighter">
                  {t.status === 'occupied' ? '사용중' : '빈'}
                </span>
                {t.seats < reservation.partySize && (
                  <span className="ml-1 text-[10px] text-reserved">병합</span>
                )}
              </button>
            ))}
            {reassignableTables.length === 0 && (
              <p className="text-[11px] text-charcoal-lighter">이동 가능한 테이블 없음</p>
            )}
          </div>
          <button onClick={() => setShowChangeSelect(false)} className="text-[10px] text-charcoal-lighter mt-1.5 hover:text-charcoal">취소</button>
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
      {!showTableSelect && !showChangeSelect && !showDeleteConfirm && reservation.status === 'completed' && (
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
      {!showTableSelect && !showChangeSelect && !showDeleteConfirm && reservation.status !== 'completed' && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border">
          {/* Waiting: assigned → change; not assigned + available tables → seat */}
          {reservation.status === 'waiting' && assignedTable && (
            <button
              onClick={() => setShowChangeSelect(true)}
              className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-xl text-reserved bg-reserved/10 hover:bg-reserved/20 transition-colors"
            >
              <ArrowRightLeft size={12} />
              테이블 변경
            </button>
          )}
          {reservation.status === 'waiting' && !assignedTable && (availableTables.length > 0 || mergeSeatOptions.length > 0) && (
            <button
              onClick={() => setShowTableSelect(true)}
              className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors"
            >
              <Armchair size={12} />
              착석
            </button>
          )}
          {reservation.status === 'waiting' && !assignedTable && availableTables.length === 0 && mergeSeatOptions.length === 0 && (
            <span className="flex-1 text-[11px] text-charcoal-lighter text-center py-1.5">빈 테이블 없음</span>
          )}

          {/* Seated: complete */}
          {reservation.status === 'seated' && (
            <button
              onClick={handleComplete}
              className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-xl text-white bg-available hover:bg-available/80 transition-colors"
            >
              <CheckCircle size={12} />
              식사 완료
            </button>
          )}

          <button
            onClick={() => openModal(reservation)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-xl text-charcoal-lighter hover:text-primary hover:bg-primary/10 transition-colors"
            title="편집"
          >
            <Pencil size={13} />
          </button>
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
