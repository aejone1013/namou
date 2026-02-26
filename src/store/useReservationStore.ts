import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { planAdjacentMerge } from './mergePlanner'
import { decideNextBookingOnBaseTableClear } from './clearTablePolicies'
import { canMovePartyToTable } from './movePolicies'
import type { Reservation, TableInfo, CurrentTeam, MergedOrigin, SessionData, MergeInfo, TableSessionState } from '@/data/dummy'
import {
  TABLE_WIDTH, SNAP_SIZE, snapToGrid, getCurrentTimeHHMM,
  getTableNumber, isContiguousRange, getMergeLabel, getMergedTableHeight,
  TABLE_BASE_HEIGHT, TABLE_FIXED_SEATS, TABLES_PER_COLUMN,
  getMergeGroup, createDefaultTables,
} from '@/data/dummy'

const CANVAS_SIZE = TABLES_PER_COLUMN * TABLE_BASE_HEIGHT  // 648

function emptySessionData(): { lunch: SessionData; dinner: SessionData } {
  return {
    lunch: { tableStates: {}, merges: [] },
    dinner: { tableStates: {}, merges: [] },
  }
}

interface ReservationStore {
  // State
  reservations: Reservation[]
  tables: TableInfo[]       // Physical layout only — no session state
  sessionData: { lunch: SessionData; dinner: SessionData }
  isModalOpen: boolean
  isEditMode: boolean
  selectedTableIds: string[]
  isSetupComplete: boolean
  editingReservation: Reservation | null
  focusedTableId: string | null
  mergePreviewTableIds: string[]
  activeSession: 'lunch' | 'dinner'

  // Undo (non-persisted)
  _undoSnapshot: { reservations: Reservation[]; tables: TableInfo[]; sessionData: { lunch: SessionData; dinner: SessionData } } | null
  _undoLabel: string | null
  saveUndoSnapshot: (label: string) => void
  undo: () => void

  // Session Actions
  setActiveSession: (session: 'lunch' | 'dinner') => void

  // Setup Actions
  resetSetup: () => void
  resetReservations: () => void

  // Reservation Actions
  addReservation: (data: Omit<Reservation, 'id' | 'status'>) => void
  updateReservation: (id: string, data: Partial<Omit<Reservation, 'id' | 'status'>>) => void
  updateReservationStatus: (id: string, status: Reservation['status']) => void
  removeReservation: (id: string) => void

  // Table Actions
  getEffectiveTables: () => TableInfo[]
  seatReservation: (reservationId: string, tableId: string) => void
  seatWithAutoMerge: (reservationId: string, tableId: string) => void
  seatWithSelectedMerge: (reservationId: string, tableId: string, mergeTableIds: string[]) => void
  clearTable: (tableId: string) => void
  walkInTable: (tableId: string, partySize: number, name?: string) => void
  moveToTable: (fromTableId: string, toTableId: string) => void
  setNextBooking: (tableId: string, reservationId: string) => void
  clearNextBooking: (tableId: string) => void
  setNextBookingTargetLabel: (tableId: string, label?: string) => void
  setFocusedTable: (id: string | null) => void
  setMergePreviewTableIds: (ids: string[]) => void

  // Table Edit Actions
  toggleEditMode: () => void
  selectTable: (id: string | null) => void
  toggleSelectTable: (id: string) => void
  moveTable: (id: string, x: number, y: number) => void
  resizeTable: (id: string, width: number, height: number) => void
  updateTable: (id: string, updates: Partial<Pick<TableInfo, 'label'>>) => void
  addTable: () => void
  removeTable: (id: string) => void
  alignTables: () => void
  alignTablesHorizontal: () => void
  alignTablesVertical: () => void

  // Modal Actions
  openModal: (reservation?: Reservation) => void
  closeModal: () => void
}

function getNextId(items: { id: string }[], prefix: string): string {
  const maxNum = items.reduce((max, item) => {
    const num = parseInt(item.id.replace(prefix, ''), 10)
    return isNaN(num) ? max : Math.max(max, num)
  }, 0)
  return `${prefix}${maxNum + 1}`
}

/** 고아 병합 자동 분할: currentTeam·nextBooking 모두 null인 merged table을 개별 테이블로 복원 */
function autoSplitOrphanMerges(
  tableStates: Record<string, TableSessionState>,
  merges: MergeInfo[]
): { tableStates: Record<string, TableSessionState>; merges: MergeInfo[] } {
  const newTableStates = { ...tableStates }
  const newMerges = [...merges]

  for (let i = newMerges.length - 1; i >= 0; i--) {
    const m = newMerges[i]
    const ts = newTableStates[m.mergedId]
    if (ts && !ts.currentTeam && !ts.nextBooking) {
      delete newTableStates[m.mergedId]
      for (const origin of m.mergedFrom) {
        newTableStates[origin.id] = { status: 'available', currentTeam: null, nextBooking: null }
      }
      newMerges.splice(i, 1)
    }
  }

  return { tableStates: newTableStates, merges: newMerges }
}

function allUsedIds(tables: TableInfo[], sessionData: { lunch: SessionData; dinner: SessionData }): { id: string }[] {
  return [
    ...tables,
    ...sessionData.lunch.merges.map((m) => ({ id: m.mergedId })),
    ...sessionData.dinner.merges.map((m) => ({ id: m.mergedId })),
  ]
}

export const useReservationStore = create<ReservationStore>()(
  persist(
    (set, get) => ({
      reservations: [],
      tables: createDefaultTables(),
      sessionData: emptySessionData(),
      isModalOpen: false,
      isEditMode: false,
      selectedTableIds: [],
      isSetupComplete: true,
      editingReservation: null,
      focusedTableId: null,
      mergePreviewTableIds: [],
      activeSession: 'lunch',
      _undoSnapshot: null,
      _undoLabel: null,

      saveUndoSnapshot: (label) => {
        const { reservations, tables, sessionData } = get()
        set({
          _undoSnapshot: JSON.parse(JSON.stringify({ reservations, tables, sessionData })),
          _undoLabel: label,
        })
      },

      undo: () => {
        const snapshot = get()._undoSnapshot
        if (!snapshot) return
        set({
          reservations: snapshot.reservations,
          tables: snapshot.tables,
          sessionData: snapshot.sessionData,
          _undoSnapshot: null,
          _undoLabel: null,
        })
      },

      setActiveSession: (session) => set({ activeSession: session }),

      resetSetup: () =>
        set({
          isSetupComplete: true,
          tables: createDefaultTables(),
          reservations: [],
          isEditMode: false,
          selectedTableIds: [],
          sessionData: emptySessionData(),
        }),

      resetReservations: () =>
        set({
          reservations: [],
          sessionData: emptySessionData(),
        }),

      // ── getEffectiveTables ──────────────────────────────────────────────────
      getEffectiveTables: () => {
        const { tables, sessionData, activeSession } = get()
        const sd = sessionData[activeSession]
        const hiddenIds = new Set(sd.merges.flatMap((m) => m.mergedFrom.map((o) => o.id)))

        const baseTables = tables
          .filter((t) => !hiddenIds.has(t.id))
          .map((t) => ({
            ...t,
            ...(sd.tableStates[t.id] ?? {
              status: 'available' as const,
              currentTeam: null,
              nextBooking: null,
            }),
          }))

        const mergedTables: TableInfo[] = sd.merges.map((m) => ({
          id: m.mergedId,
          label: m.label,
          shape: 'rectangle' as const,
          seats: m.seats,
          x: m.x,
          y: m.y,
          width: m.width,
          height: m.height,
          mergedFrom: m.mergedFrom,
          ...(sd.tableStates[m.mergedId] ?? {
            status: 'available' as const,
            currentTeam: null,
            nextBooking: null,
          }),
        }))

        return [...baseTables, ...mergedTables]
      },

      // ── Reservation Actions ─────────────────────────────────────────────────
      addReservation: (data) =>
        set((state) => {
          const id = getNextId(state.reservations, 'r')
          return {
            reservations: [...state.reservations, { ...data, id, status: 'waiting' }],
            isModalOpen: false,
            editingReservation: null,
          }
        }),

      updateReservation: (id, data) =>
        set((state) => {
          const reservation = state.reservations.find((r) => r.id === id)
          if (!reservation) return state

          const oldSession = reservation.period
          const newSession = (data.period ?? oldSession) as 'lunch' | 'dinner'
          const periodChanged = newSession !== oldSession

          if (periodChanged) {
            // Clean up old session: remove all references to this reservation
            const oldSd = state.sessionData[oldSession]
            const newTableStates = { ...oldSd.tableStates }
            for (const tableId of Object.keys(newTableStates)) {
              const ts = newTableStates[tableId]
              let updated = { ...ts }
              if (ts.currentTeam?.reservationId === id) {
                updated = { ...updated, status: 'available' as const, currentTeam: null }
              }
              if (ts.nextBooking?.reservationId === id) {
                updated = { ...updated, nextBooking: null }
              }
              newTableStates[tableId] = updated
            }
            const cleaned = autoSplitOrphanMerges(newTableStates, oldSd.merges)
            return {
              reservations: state.reservations.map((r) =>
                r.id === id ? { ...r, ...data, status: 'waiting' as const, tableId: undefined } : r
              ),
              sessionData: {
                ...state.sessionData,
                [oldSession]: { tableStates: cleaned.tableStates, merges: cleaned.merges },
              },
              isModalOpen: false,
              editingReservation: null,
            }
          }

          // Period unchanged: update table state refs in old session
          const sd = state.sessionData[oldSession]
          const newTableStates = { ...sd.tableStates }

          for (const tableId of Object.keys(newTableStates)) {
            const ts = newTableStates[tableId]
            let updated = { ...ts }
            if (ts.currentTeam?.reservationId === id) {
              updated = {
                ...updated,
                currentTeam: {
                  ...ts.currentTeam!,
                  name: data.name ?? reservation.name,
                  partySize: data.partySize ?? reservation.partySize,
                },
              }
            }
            if (ts.nextBooking?.reservationId === id) {
              updated = {
                ...updated,
                nextBooking: {
                  ...ts.nextBooking!,
                  name: data.name ?? reservation.name,
                  partySize: data.partySize ?? reservation.partySize,
                  startTime: data.startTime ?? reservation.startTime,
                  endTime: data.endTime ?? reservation.endTime,
                },
              }
            }
            newTableStates[tableId] = updated
          }

          return {
            reservations: state.reservations.map((r) => (r.id === id ? { ...r, ...data } : r)),
            sessionData: {
              ...state.sessionData,
              [oldSession]: { ...sd, tableStates: newTableStates },
            },
            isModalOpen: false,
            editingReservation: null,
          }
        }),

      updateReservationStatus: (id, status) =>
        set((state) => ({
          reservations: state.reservations.map((r) => (r.id === id ? { ...r, status } : r)),
        })),

      removeReservation: (id) =>
        set((state) => {
          const reservation = state.reservations.find((r) => r.id === id)
          if (!reservation) {
            return { reservations: state.reservations.filter((r) => r.id !== id) }
          }

          const session = reservation.period
          const sd = state.sessionData[session]
          const newTableStates = { ...sd.tableStates }

          for (const tableId of Object.keys(newTableStates)) {
            const ts = newTableStates[tableId]
            let updated = { ...ts }
            if (ts.currentTeam?.reservationId === id) {
              updated = { ...updated, status: 'available' as const, currentTeam: null }
            }
            if (ts.nextBooking?.reservationId === id) {
              updated = { ...updated, nextBooking: null }
            }
            newTableStates[tableId] = updated
          }

          const cleaned = autoSplitOrphanMerges(newTableStates, sd.merges)
          return {
            reservations: state.reservations.filter((r) => r.id !== id),
            sessionData: {
              ...state.sessionData,
              [session]: { tableStates: cleaned.tableStates, merges: cleaned.merges },
            },
          }
        }),

      // ── Table Actions ───────────────────────────────────────────────────────
      seatReservation: (reservationId, tableId) =>
        set((state) => {
          const reservation = state.reservations.find((r) => r.id === reservationId)
          if (!reservation) return state

          const session = reservation.period
          const sd = state.sessionData[session]
          const newTableStates = { ...sd.tableStates }

          // Clear from previous table
          const prevTableId = reservation.tableId
          if (prevTableId && newTableStates[prevTableId]) {
            newTableStates[prevTableId] = {
              ...newTableStates[prevTableId],
              status: 'available' as const,
              currentTeam: null,
            }
          }

          newTableStates[tableId] = {
            status: 'occupied' as const,
            currentTeam: {
              reservationId,
              name: reservation.name,
              partySize: reservation.partySize,
              seatedAt: getCurrentTimeHHMM(),
            },
            nextBooking:
              sd.tableStates[tableId]?.nextBooking?.reservationId === reservationId
                ? null
                : sd.tableStates[tableId]?.nextBooking ?? null,
          }

          return {
            reservations: state.reservations.map((r) =>
              r.id === reservationId ? { ...r, status: 'seated', tableId } : r
            ),
            sessionData: {
              ...state.sessionData,
              [session]: { ...sd, tableStates: newTableStates },
            },
          }
        }),

      seatWithAutoMerge: (reservationId, tableId) => {
        const state = get()
        const effectiveTables = state.getEffectiveTables()
        const reservation = state.reservations.find((r) => r.id === reservationId)
        const table = effectiveTables.find((t) => t.id === tableId)
        if (!reservation || !table) return

        const session = state.activeSession
        const sd = state.sessionData[session]
        const baseTableIds = new Set(state.tables.map((t) => t.id))

        const simpleSet = (targetTableId: string) => {
          set((s) => {
            const sd2 = s.sessionData[session]
            const newTableStates = { ...sd2.tableStates }
            const prevTableId = reservation.tableId
            if (prevTableId && newTableStates[prevTableId]) {
              newTableStates[prevTableId] = { ...newTableStates[prevTableId], status: 'available' as const, currentTeam: null }
            }
            newTableStates[targetTableId] = {
              status: 'occupied' as const,
              currentTeam: {
                reservationId,
                name: reservation.name,
                partySize: reservation.partySize,
                seatedAt: getCurrentTimeHHMM(),
              },
              nextBooking:
                sd2.tableStates[targetTableId]?.nextBooking?.reservationId === reservationId
                  ? null
                  : sd2.tableStates[targetTableId]?.nextBooking ?? null,
            }
            return {
              reservations: s.reservations.map((r) =>
                r.id === reservationId ? { ...r, status: 'seated', tableId: targetTableId } : r
              ),
              sessionData: {
                ...s.sessionData,
                [session]: { ...sd2, tableStates: newTableStates },
              },
            }
          })
        }

        if (reservation.partySize <= table.seats) {
          simpleSet(tableId)
          return
        }

        // Need more seats — find adjacent available base tables (same column only)
        const baseNum = getTableNumber(table.label)
        const group = getMergeGroup(baseNum)
        const available = effectiveTables.filter((t) => {
          const status = sd.tableStates[t.id]?.status ?? 'available'
          const tNum = getTableNumber(t.label)
          return baseTableIds.has(t.id) && status === 'available' && t.id !== tableId
            && (group ? group.includes(tNum) : true)
        })

        const mergePlan = planAdjacentMerge(
          baseNum,
          table.seats,
          reservation.partySize,
          available.map((t) => ({ id: t.id, num: getTableNumber(t.label), seats: t.seats }))
        )
        if (!mergePlan) {
          return  // 인접 테이블 부족, 착석하지 않음
        }
        const toMerge = available.filter((t) => mergePlan.selectedIds.includes(t.id))
        const allNums = mergePlan.selectedNums

        // Merge all selected tables
        const allToMerge = [table, ...toMerge]
        const firstTable = allToMerge.reduce((best, t) =>
          getTableNumber(t.label) < getTableNumber(best.label) ? t : best
        )
        const minY = Math.min(...allToMerge.map(t => t.y))
        const totalSeats = allToMerge.reduce((sum, t) => sum + t.seats, 0)
        const mergedLabel = getMergeLabel(allNums)
        const origins: MergedOrigin[] = allToMerge.map((t) => ({
          id: t.id,
          label: t.label,
          seats: t.seats,
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
        }))

        set((s) => {
          const sd2 = s.sessionData[session]
          const mergedId = getNextId(allUsedIds(s.tables, s.sessionData), 't')

          const newMerge: MergeInfo = {
            mergedId,
            mergedFrom: origins,
            label: mergedLabel,
            seats: totalSeats,
            x: firstTable.x,
            y: minY,
            width: TABLE_WIDTH,
            height: getMergedTableHeight(allToMerge.length),
          }

          const newTableStates = { ...sd2.tableStates }
          newTableStates[mergedId] = {
            status: 'occupied' as const,
            currentTeam: {
              reservationId,
              name: reservation.name,
              partySize: reservation.partySize,
              seatedAt: getCurrentTimeHHMM(),
            },
            nextBooking: null,
          }

          return {
            reservations: s.reservations.map((r) =>
              r.id === reservationId ? { ...r, status: 'seated', tableId: mergedId } : r
            ),
            sessionData: {
              ...s.sessionData,
              [session]: {
                tableStates: newTableStates,
                merges: [...sd2.merges, newMerge],
              },
            },
          }
        })
      },

      seatWithSelectedMerge: (reservationId, tableId, mergeTableIds) => {
        const state = get()
        const effectiveTables = state.getEffectiveTables()
        const reservation = state.reservations.find((r) => r.id === reservationId)
        const table = effectiveTables.find((t) => t.id === tableId)
        if (!reservation || !table) return

        const session = state.activeSession
        const baseTableIds = new Set(state.tables.map((t) => t.id))

        const selectedTables = effectiveTables.filter((t) => mergeTableIds.includes(t.id))
        if (selectedTables.length !== mergeTableIds.length) return
        if (!baseTableIds.has(table.id) || selectedTables.some((t) => !baseTableIds.has(t.id))) return
        if (table.status !== 'available' || selectedTables.some((t) => t.status !== 'available')) return

        const allToMerge = [table, ...selectedTables.filter((t) => t.id !== table.id)]
        const allNums = allToMerge.map((t) => getTableNumber(t.label))
        if (!isContiguousRange(allNums)) return

        const totalSeats = allToMerge.reduce((sum, t) => sum + t.seats, 0)
        if (totalSeats < reservation.partySize) return

        const firstTable = allToMerge.reduce((best, t) =>
          getTableNumber(t.label) < getTableNumber(best.label) ? t : best
        )
        const minY = Math.min(...allToMerge.map((t) => t.y))
        const mergedLabel = getMergeLabel(allNums)
        const origins: MergedOrigin[] = allToMerge.map((t) => ({
          id: t.id,
          label: t.label,
          seats: t.seats,
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
        }))

        set((s) => {
          const sd2 = s.sessionData[session]
          const mergedId = getNextId(allUsedIds(s.tables, s.sessionData), 't')

          const newMerge: MergeInfo = {
            mergedId,
            mergedFrom: origins,
            label: mergedLabel,
            seats: totalSeats,
            x: firstTable.x,
            y: minY,
            width: TABLE_WIDTH,
            height: getMergedTableHeight(allToMerge.length),
          }

          const newTableStates = { ...sd2.tableStates }
          for (const t of allToMerge) delete newTableStates[t.id]
          newTableStates[mergedId] = {
            status: 'occupied' as const,
            currentTeam: {
              reservationId,
              name: reservation.name,
              partySize: reservation.partySize,
              seatedAt: getCurrentTimeHHMM(),
            },
            nextBooking: null,
          }

          return {
            reservations: s.reservations.map((r) =>
              r.id === reservationId ? { ...r, status: 'seated', tableId: mergedId } : r
            ),
            sessionData: {
              ...s.sessionData,
              [session]: {
                tableStates: newTableStates,
                merges: [...sd2.merges, newMerge],
              },
            },
          }
        })
      },

      clearTable: (tableId) =>
        set((state) => {
          const session = state.activeSession
          const sd = state.sessionData[session]
          const tableState = sd.tableStates[tableId]
          const reservationId = tableState?.currentTeam?.reservationId

          const updatedReservations = reservationId
            ? state.reservations.map((r) =>
                r.id === reservationId ? { ...r, status: 'completed' as const, tableId: undefined } : r
              )
            : state.reservations

          const merge = sd.merges.find((m) => m.mergedId === tableId)

          if (merge) {
            // Auto-split
            const newMerges = sd.merges.filter((m) => m.mergedId !== tableId)
            const newTableStates = { ...sd.tableStates }
            delete newTableStates[tableId]

            for (const origin of merge.mergedFrom) {
              newTableStates[origin.id] = { status: 'available', currentTeam: null, nextBooking: null }
            }

            const nb = tableState?.nextBooking
            if (nb) {
              const nbReservation = state.reservations.find((r) => r.id === nb.reservationId)
              if (nbReservation) {
                const restoredInfos = merge.mergedFrom.map((o) => ({
                  id: o.id, label: o.label, seats: o.seats,
                  x: o.x, y: o.y, width: o.width, height: o.height,
                }))

                // Assign to specific sub-table
                if (nb.targetLabel) {
                  const target = restoredInfos.find((t) => t.label === nb.targetLabel)
                  if (target) {
                    newTableStates[target.id] = {
                      status: 'occupied',
                      currentTeam: {
                        reservationId: nb.reservationId,
                        name: nb.name,
                        partySize: nb.partySize,
                        seatedAt: getCurrentTimeHHMM(),
                      },
                      nextBooking: null,
                    }
                    return {
                      reservations: updatedReservations.map((r) =>
                        r.id === nb.reservationId ? { ...r, status: 'seated' as const, tableId: target.id } : r
                      ),
                      sessionData: {
                        ...state.sessionData,
                        [session]: { tableStates: newTableStates, merges: newMerges },
                      },
                    }
                  }
                }

                // Find minimum contiguous subset
                const nums = restoredInfos.map((t) => getTableNumber(t.label)).sort((a, b) => a - b)
                let bestCombo: number[] | null = null
                for (let start = 0; start < nums.length; start++) {
                  let seats = 0
                  const combo: number[] = []
                  for (let end = start; end < nums.length; end++) {
                    const rt = restoredInfos.find((t) => getTableNumber(t.label) === nums[end])
                    if (rt) { seats += rt.seats; combo.push(nums[end]) }
                    if (seats >= nb.partySize) {
                      if (!bestCombo || combo.length < bestCombo.length) bestCombo = [...combo]
                      break
                    }
                  }
                }

                if (bestCombo && bestCombo.length >= 2 && isContiguousRange(bestCombo)) {
                  // Re-merge subset
                  const mergeTargets = restoredInfos.filter((t) => bestCombo!.includes(getTableNumber(t.label)))
                  const reMergedId = getNextId(
                    [...state.tables, ...newMerges.map((m) => ({ id: m.mergedId }))],
                    't'
                  )
                  const firstT = mergeTargets.reduce((best, t) =>
                    getTableNumber(t.label) < getTableNumber(best.label) ? t : best
                  )
                  const reMergeMinY = Math.min(...mergeTargets.map(t => t.y))
                  const totalSeats = mergeTargets.reduce((sum, t) => sum + t.seats, 0)

                  const reMerge: MergeInfo = {
                    mergedId: reMergedId,
                    mergedFrom: mergeTargets.map((t) => ({
                      id: t.id, label: t.label, seats: t.seats,
                      x: t.x, y: t.y, width: t.width, height: t.height,
                    })),
                    label: getMergeLabel(bestCombo),
                    seats: totalSeats,
                    x: firstT.x,
                    y: reMergeMinY,
                    width: TABLE_WIDTH,
                    height: getMergedTableHeight(mergeTargets.length),
                  }

                  for (const num of bestCombo) {
                    const rt = restoredInfos.find((t) => getTableNumber(t.label) === num)
                    if (rt) delete newTableStates[rt.id]
                  }
                  newTableStates[reMergedId] = {
                    status: 'occupied',
                    currentTeam: {
                      reservationId: nb.reservationId,
                      name: nb.name,
                      partySize: nb.partySize,
                      seatedAt: getCurrentTimeHHMM(),
                    },
                    nextBooking: null,
                  }

                  return {
                    reservations: updatedReservations.map((r) =>
                      r.id === nb.reservationId ? { ...r, status: 'seated' as const, tableId: reMergedId } : r
                    ),
                    sessionData: {
                      ...state.sessionData,
                      [session]: { tableStates: newTableStates, merges: [...newMerges, reMerge] },
                    },
                  }
                }

                if (bestCombo && bestCombo.length === 1) {
                  const target = restoredInfos.find((t) => getTableNumber(t.label) === bestCombo![0])
                  if (target) {
                    newTableStates[target.id] = {
                      status: 'occupied',
                      currentTeam: {
                        reservationId: nb.reservationId,
                        name: nb.name,
                        partySize: nb.partySize,
                        seatedAt: getCurrentTimeHHMM(),
                      },
                      nextBooking: null,
                    }
                    return {
                      reservations: updatedReservations.map((r) =>
                        r.id === nb.reservationId ? { ...r, status: 'seated' as const, tableId: target.id } : r
                      ),
                      sessionData: {
                        ...state.sessionData,
                        [session]: { tableStates: newTableStates, merges: newMerges },
                      },
                    }
                  }
                }
              }
            }

            return {
              reservations: updatedReservations,
              sessionData: {
                ...state.sessionData,
                [session]: { tableStates: newTableStates, merges: newMerges },
              },
            }
          }

          // Non-merged table
          const newTableStates = { ...sd.tableStates }
          const nb = tableState?.nextBooking

          if (nb) {
            const nbReservation = state.reservations.find((r) => r.id === nb.reservationId)
            if (nbReservation) {
              const baseTable = state.tables.find((t) => t.id === tableId)
              const baseSeats = baseTable?.seats ?? 0
              if (decideNextBookingOnBaseTableClear(baseSeats, nb.partySize) === 'keep-next-booking') {
                // Keep the next booking on the table and let the operator choose a merge target.
                newTableStates[tableId] = {
                  status: 'available',
                  currentTeam: null,
                  nextBooking: nb,
                }
                return {
                  reservations: updatedReservations,
                  sessionData: {
                    ...state.sessionData,
                    [session]: { ...sd, tableStates: newTableStates },
                  },
                }
              }

              newTableStates[tableId] = {
                status: 'occupied',
                currentTeam: {
                  reservationId: nb.reservationId,
                  name: nb.name,
                  partySize: nb.partySize,
                  seatedAt: getCurrentTimeHHMM(),
                },
                nextBooking: null,
              }
              return {
                reservations: updatedReservations.map((r) =>
                  r.id === nb.reservationId ? { ...r, status: 'seated' as const, tableId } : r
                ),
                sessionData: {
                  ...state.sessionData,
                  [session]: { ...sd, tableStates: newTableStates },
                },
              }
            }
          }

          newTableStates[tableId] = { status: 'available', currentTeam: null, nextBooking: null }
          return {
            reservations: updatedReservations,
            sessionData: {
              ...state.sessionData,
              [session]: { ...sd, tableStates: newTableStates },
            },
          }
        }),

      walkInTable: (tableId, partySize, name) =>
        set((state) => {
          const session = state.activeSession
          const sd = state.sessionData[session]
          const status = sd.tableStates[tableId]?.status ?? 'available'
          if (status !== 'available') return state

          const displayName = name || '워크인'
          const newTableStates = { ...sd.tableStates }
          newTableStates[tableId] = {
            status: 'occupied' as const,
            currentTeam: {
              name: displayName,
              partySize,
              seatedAt: getCurrentTimeHHMM(),
            },
            nextBooking: sd.tableStates[tableId]?.nextBooking ?? null,
          }

          return {
            sessionData: {
              ...state.sessionData,
              [session]: { ...sd, tableStates: newTableStates },
            },
          }
        }),

      moveToTable: (fromTableId, toTableId) =>
        set((state) => {
          const session = state.activeSession
          const sd = state.sessionData[session]
          const fromState = sd.tableStates[fromTableId]
          const toStatus = sd.tableStates[toTableId]?.status ?? 'available'

          if (fromState?.status !== 'occupied' || toStatus !== 'available') return state

          const partySize = fromState.currentTeam?.partySize ?? 0
          const baseTable = state.tables.find((t) => t.id === toTableId)
          const mergeInfo = sd.merges.find((m) => m.mergedId === toTableId)
          const toSeats = baseTable?.seats ?? mergeInfo?.seats ?? 0
          if (!canMovePartyToTable(partySize, toSeats)) {
            // Try auto-merge move when destination is a base table.
            if (!baseTable || !fromState.currentTeam) return state

            const effectiveTables = state.getEffectiveTables()
            const baseTableIds = new Set(state.tables.map((t) => t.id))
            const fromMerge = sd.merges.find((m) => m.mergedId === fromTableId)
            const freedOriginIds = new Set(
              fromMerge ? fromMerge.mergedFrom.map((o) => o.id) : [fromTableId]
            )
            const targetNum = getTableNumber(baseTable.label)
            const group = getMergeGroup(targetNum)

            const availableBaseCandidates = effectiveTables.filter((t) => {
              if (!baseTableIds.has(t.id) || t.id === toTableId) return false
              const tNum = getTableNumber(t.label)
              if (group && !group.includes(tNum)) return false

              if (freedOriginIds.has(t.id)) return true
              const status = sd.tableStates[t.id]?.status ?? 'available'
              return status === 'available'
            })

            const mergePlan = planAdjacentMerge(
              targetNum,
              baseTable.seats,
              partySize,
              availableBaseCandidates.map((t) => ({ id: t.id, num: getTableNumber(t.label), seats: t.seats }))
            )
            if (!mergePlan) return state
            const toMerge = availableBaseCandidates.filter((t) => mergePlan.selectedIds.includes(t.id))
            const allNums = mergePlan.selectedNums

            const newTableStates = { ...sd.tableStates }
            let newMerges = [...sd.merges]

            // Release source occupancy first.
            if (fromMerge) {
              newMerges = newMerges.filter((m) => m.mergedId !== fromMerge.mergedId)
              delete newTableStates[fromMerge.mergedId]
              for (const origin of fromMerge.mergedFrom) {
                newTableStates[origin.id] = { status: 'available', currentTeam: null, nextBooking: null }
              }
              if (fromState.nextBooking) {
                const keepTarget = fromMerge.mergedFrom
                  .slice()
                  .sort((a, b) => getTableNumber(a.label) - getTableNumber(b.label))[0]
                if (keepTarget) {
                  newTableStates[keepTarget.id] = {
                    status: 'available',
                    currentTeam: null,
                    nextBooking: fromState.nextBooking,
                  }
                }
              }
            } else {
              newTableStates[fromTableId] = {
                status: 'available' as const,
                currentTeam: null,
                nextBooking: fromState.nextBooking,
              }
            }

            const destinationTables = [baseTable, ...toMerge]
            const firstTable = destinationTables.reduce((best, t) =>
              getTableNumber(t.label) < getTableNumber(best.label) ? t : best
            )
            const minY = Math.min(...destinationTables.map((t) => t.y))
            const totalSeats = destinationTables.reduce((sum, t) => sum + t.seats, 0)
            const mergedId = getNextId(allUsedIds(state.tables, state.sessionData), 't')

            for (const t of destinationTables) {
              delete newTableStates[t.id]
            }

            newTableStates[mergedId] = {
              status: 'occupied',
              currentTeam: fromState.currentTeam,
              nextBooking: null,
            }

            newMerges.push({
              mergedId,
              mergedFrom: destinationTables.map((t) => ({
                id: t.id,
                label: t.label,
                seats: t.seats,
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height,
              })),
              label: getMergeLabel(allNums),
              seats: totalSeats,
              x: firstTable.x,
              y: minY,
              width: TABLE_WIDTH,
              height: getMergedTableHeight(destinationTables.length),
            })

            const cleaned = autoSplitOrphanMerges(newTableStates, newMerges)
            const reservationId = fromState.currentTeam.reservationId
            return {
              sessionData: {
                ...state.sessionData,
                [session]: { tableStates: cleaned.tableStates, merges: cleaned.merges },
              },
              reservations: reservationId
                ? state.reservations.map((r) =>
                    r.id === reservationId ? { ...r, tableId: mergedId } : r
                  )
                : state.reservations,
            }
          }

          const newTableStates = { ...sd.tableStates }
          newTableStates[fromTableId] = {
            status: 'available' as const,
            currentTeam: null,
            nextBooking: fromState.nextBooking,
          }
          newTableStates[toTableId] = {
            status: 'occupied' as const,
            currentTeam: fromState.currentTeam,
            nextBooking: sd.tableStates[toTableId]?.nextBooking ?? null,
          }

          const cleaned = autoSplitOrphanMerges(newTableStates, sd.merges)
          const reservationId = fromState.currentTeam?.reservationId
          return {
            sessionData: {
              ...state.sessionData,
              [session]: { tableStates: cleaned.tableStates, merges: cleaned.merges },
            },
            reservations: reservationId
              ? state.reservations.map((r) =>
                  r.id === reservationId ? { ...r, tableId: toTableId } : r
                )
              : state.reservations,
          }
        }),

      setNextBooking: (tableId, reservationId) =>
        set((state) => {
          const reservation = state.reservations.find((r) => r.id === reservationId)
          if (!reservation) return state

          const session = state.activeSession
          const sd = state.sessionData[session]
          const current = sd.tableStates[tableId]
          const newTableStates = { ...sd.tableStates }

          // Remove duplicate nextBooking for this reservation from any other table
          for (const tid of Object.keys(newTableStates)) {
            if (newTableStates[tid].nextBooking?.reservationId === reservationId) {
              newTableStates[tid] = { ...newTableStates[tid], nextBooking: null }
            }
          }

          newTableStates[tableId] = {
            status: current?.status ?? 'available',
            currentTeam: current?.currentTeam ?? null,
            nextBooking: {
              reservationId,
              name: reservation.name,
              partySize: reservation.partySize,
              startTime: reservation.startTime,
              endTime: reservation.endTime,
            },
          }

          const cleaned = autoSplitOrphanMerges(newTableStates, sd.merges)
          return {
            sessionData: {
              ...state.sessionData,
              [session]: { tableStates: cleaned.tableStates, merges: cleaned.merges },
            },
          }
        }),

      clearNextBooking: (tableId) =>
        set((state) => {
          const session = state.activeSession
          const sd = state.sessionData[session]
          if (!sd.tableStates[tableId]) return state

          const newTableStates = { ...sd.tableStates }
          newTableStates[tableId] = { ...newTableStates[tableId], nextBooking: null }

          const cleaned = autoSplitOrphanMerges(newTableStates, sd.merges)
          return {
            sessionData: {
              ...state.sessionData,
              [session]: { tableStates: cleaned.tableStates, merges: cleaned.merges },
            },
          }
        }),

      setNextBookingTargetLabel: (tableId, label) =>
        set((state) => {
          const session = state.activeSession
          const sd = state.sessionData[session]
          const tableState = sd.tableStates[tableId]
          if (!tableState?.nextBooking) return state

          const newTableStates = { ...sd.tableStates }
          newTableStates[tableId] = {
            ...tableState,
            nextBooking: { ...tableState.nextBooking, targetLabel: label },
          }

          return {
            sessionData: {
              ...state.sessionData,
              [session]: { ...sd, tableStates: newTableStates },
            },
          }
        }),

      setFocusedTable: (id) => set({ focusedTableId: id }),
      setMergePreviewTableIds: (ids) => {
        const prev = get().mergePreviewTableIds
        if (
          prev.length === ids.length &&
          prev.every((value, index) => value === ids[index])
        ) {
          return
        }
        set({ mergePreviewTableIds: ids })
      },

      // ── Table Edit Actions ──────────────────────────────────────────────────
      toggleEditMode: () =>
        set((state) => ({
          isEditMode: !state.isEditMode,
          selectedTableIds: [],
        })),

      selectTable: (id) => set({ selectedTableIds: id ? [id] : [] }),

      toggleSelectTable: (id) =>
        set((state) => {
          const isSelected = state.selectedTableIds.includes(id)
          return {
            selectedTableIds: isSelected
              ? state.selectedTableIds.filter((tid) => tid !== id)
              : [...state.selectedTableIds, id],
          }
        }),

      moveTable: (id, x, y) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === id ? { ...t, x: snapToGrid(x), y: snapToGrid(y) } : t
          ),
        })),

      resizeTable: (id, width, height) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === id ? { ...t, width, height } : t
          ),
        })),

      updateTable: (id, updates) =>
        set((state) => ({
          tables: state.tables.map((t) => (t.id !== id ? t : { ...t, ...updates })),
        })),

      addTable: () =>
        set((state) => {
          const id = getNextId(allUsedIds(state.tables, state.sessionData), 't')
          const num = parseInt(id.replace('t', ''), 10)
          const count = state.tables.length

          const col = Math.floor(count / TABLES_PER_COLUMN)
          const row = count % TABLES_PER_COLUMN

          const x = Math.max(0, CANVAS_SIZE - (col + 1) * TABLE_WIDTH)
          const y = Math.max(0, CANVAS_SIZE - (row + 1) * TABLE_BASE_HEIGHT)

          const newTable: TableInfo = {
            id,
            label: `T${num}`,
            shape: 'rectangle',
            seats: TABLE_FIXED_SEATS,
            x,
            y,
            width: TABLE_WIDTH,
            height: TABLE_BASE_HEIGHT,
            status: 'available',
            currentTeam: null,
            nextBooking: null,
          }

          return {
            tables: [...state.tables, newTable],
            selectedTableIds: [id],
          }
        }),

      removeTable: (id) =>
        set((state) => {
          const processSession = (sd: SessionData) => {
            const affectedResIds = new Set<string>()
            const ts = sd.tableStates[id]
            if (ts?.currentTeam?.reservationId) affectedResIds.add(ts.currentTeam.reservationId)
            if (ts?.nextBooking?.reservationId) affectedResIds.add(ts.nextBooking.reservationId)

            const affectedMerges = sd.merges.filter(
              (m) => m.mergedFrom.some((o) => o.id === id) || m.mergedId === id
            )
            for (const merge of affectedMerges) {
              const mts = sd.tableStates[merge.mergedId]
              if (mts?.currentTeam?.reservationId) affectedResIds.add(mts.currentTeam.reservationId)
              if (mts?.nextBooking?.reservationId) affectedResIds.add(mts.nextBooking.reservationId)
            }

            const newTableStates = { ...sd.tableStates }
            delete newTableStates[id]
            for (const merge of affectedMerges) {
              delete newTableStates[merge.mergedId]
              for (const origin of merge.mergedFrom) {
                if (origin.id !== id) {
                  newTableStates[origin.id] = { status: 'available', currentTeam: null, nextBooking: null }
                }
              }
            }

            const newMerges = sd.merges.filter(
              (m) => !m.mergedFrom.some((o) => o.id === id) && m.mergedId !== id
            )

            return { newTableStates, newMerges, affectedResIds }
          }

          const {
            newTableStates: lunchTableStates,
            newMerges: lunchMerges,
            affectedResIds: lunchAffected,
          } = processSession(state.sessionData.lunch)
          const {
            newTableStates: dinnerTableStates,
            newMerges: dinnerMerges,
            affectedResIds: dinnerAffected,
          } = processSession(state.sessionData.dinner)

          const allAffected = new Set([...lunchAffected, ...dinnerAffected])

          return {
            tables: state.tables.filter((t) => t.id !== id),
            selectedTableIds: state.selectedTableIds.filter((tid) => tid !== id),
            reservations: state.reservations.map((r) =>
              allAffected.has(r.id) ? { ...r, status: 'waiting' as const, tableId: undefined } : r
            ),
            sessionData: {
              lunch: { tableStates: lunchTableStates, merges: lunchMerges },
              dinner: { tableStates: dinnerTableStates, merges: dinnerMerges },
            },
          }
        }),

      alignTables: () =>
        set((state) => ({
          tables: state.tables.map((t) => ({
            ...t,
            x: snapToGrid(t.x),
            y: snapToGrid(t.y),
          })),
        })),

      alignTablesHorizontal: () =>
        set((state) => {
          if (state.selectedTableIds.length < 2) return state
          const selected = state.tables.filter((t) => state.selectedTableIds.includes(t.id))
          const minY = Math.min(...selected.map((t) => t.y))
          return {
            tables: state.tables.map((t) =>
              state.selectedTableIds.includes(t.id) ? { ...t, y: snapToGrid(minY) } : t
            ),
          }
        }),

      alignTablesVertical: () =>
        set((state) => {
          if (state.selectedTableIds.length < 2) return state
          const selected = state.tables.filter((t) => state.selectedTableIds.includes(t.id))
          const minX = Math.min(...selected.map((t) => t.x))
          return {
            tables: state.tables.map((t) =>
              state.selectedTableIds.includes(t.id) ? { ...t, x: snapToGrid(minX) } : t
            ),
          }
        }),

      openModal: (reservation) =>
        set({ isModalOpen: true, editingReservation: reservation || null }),
      closeModal: () =>
        set({ isModalOpen: false, editingReservation: null }),
    }),
    {
      name: 'namou-storage',
      version: 6,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>
        if (version < 2) {
          if (Array.isArray(state.tables)) {
            state.tables = state.tables.map((t: Record<string, unknown>) => {
              const currentTeam: CurrentTeam | null =
                t.status === 'occupied' && t.reservation
                  ? {
                      reservationId: t.reservationId as string | undefined,
                      name: (t.reservation as string).replace(/\s*\(\d+명\)$/, ''),
                      partySize: parseInt(
                        ((t.reservation as string).match(/\((\d+)명\)/)?.[1]) || '2',
                        10
                      ),
                      seatedAt: getCurrentTimeHHMM(),
                    }
                  : null
              const { reservation: _r, reservationId: _rid, ...rest } = t
              return { ...rest, currentTeam, nextBooking: null }
            })
          }
        }
        if (version < 3) {
          if (Array.isArray(state.tables)) {
            state.tables = state.tables.map((t: Record<string, unknown>) => {
              if (
                t.mergedFrom &&
                Array.isArray(t.mergedFrom) &&
                typeof (t.mergedFrom as unknown[])[0] === 'string'
              ) {
                t.mergedFrom = (t.mergedFrom as string[]).map((id: string, i: number) => ({
                  id,
                  label: `T${id.replace('t', '')}`,
                  seats: Math.max(1, Math.floor(((t.seats as number) || 2) / (t.mergedFrom as unknown[]).length)),
                  x: snapToGrid((t.x as number) + i * (TABLE_WIDTH + SNAP_SIZE)),
                  y: t.y,
                  width: TABLE_WIDTH,
                  height: TABLE_BASE_HEIGHT,
                }))
              }
              return t
            })
          }
        }
        if (version < 4) {
          state.activeSession = state.activeSession || 'lunch'
        }
        if (version < 5) {
          // v4 → v5: move status/currentTeam/nextBooking from tables into sessionData
          // Expand merged tables back to individual tables, reset all session state
          if (Array.isArray(state.tables)) {
            const expandedTables: Record<string, unknown>[] = []
            for (const t of state.tables as Record<string, unknown>[]) {
              if (t.mergedFrom && Array.isArray(t.mergedFrom) && (t.mergedFrom as unknown[]).length >= 2) {
                for (const origin of t.mergedFrom as Record<string, unknown>[]) {
                  const conflict = expandedTables.some((et) => et.id === origin.id)
                  if (!conflict) {
                    expandedTables.push({
                      id: origin.id,
                      label: origin.label,
                      shape: 'rectangle',
                      seats: TABLE_FIXED_SEATS,
                      x: origin.x,
                      y: origin.y,
                      width: origin.width ?? TABLE_WIDTH,
                      height: origin.height ?? TABLE_BASE_HEIGHT,
                      status: 'available',
                      currentTeam: null,
                      nextBooking: null,
                    })
                  }
                }
              } else {
                expandedTables.push({
                  ...t,
                  seats: TABLE_FIXED_SEATS,
                  height: TABLE_BASE_HEIGHT,
                  status: 'available',
                  currentTeam: null,
                  nextBooking: null,
                  mergedFrom: undefined,
                })
              }
            }
            state.tables = expandedTables
          }
          // Reset reservations that were 'seated' back to 'waiting'
          if (Array.isArray(state.reservations)) {
            state.reservations = (state.reservations as Record<string, unknown>[]).map((r) =>
              r.status === 'seated' ? { ...r, status: 'waiting', tableId: undefined } : r
            )
          }
          state.sessionData = {
            lunch: { tableStates: {}, merges: [] },
            dinner: { tableStates: {}, merges: [] },
          }
        }
        if (version < 6) {
          // v5 → v6: replace any layout with fixed 16-table default
          state.tables = createDefaultTables()
          state.isSetupComplete = true
          state.sessionData = {
            lunch: { tableStates: {}, merges: [] },
            dinner: { tableStates: {}, merges: [] },
          }
          if (Array.isArray(state.reservations)) {
            state.reservations = (state.reservations as Record<string, unknown>[]).map((r) =>
              r.status === 'seated' ? { ...r, status: 'waiting', tableId: undefined } : r
            )
          }
        }
        return persisted
      },
      partialize: (state) => ({
        tables: state.tables,
        reservations: state.reservations,
        isSetupComplete: state.isSetupComplete,
        activeSession: state.activeSession,
        sessionData: state.sessionData,
      }) as Partial<ReservationStore>,
    }
  )
)
