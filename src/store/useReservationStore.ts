import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Reservation, TableInfo, CurrentTeam, MergedOrigin } from '@/data/dummy'
import { TABLE_WIDTH, SNAP_SIZE, getTableHeight, snapToGrid, getCurrentTimeHHMM, getTableNumber, isContiguousRange, getMergeLabel } from '@/data/dummy'

interface ReservationStore {
  // State
  reservations: Reservation[]
  tables: TableInfo[]
  isModalOpen: boolean
  isEditMode: boolean
  selectedTableIds: string[]
  isSetupComplete: boolean
  editingReservation: Reservation | null
  focusedTableId: string | null
  activeSession: 'lunch' | 'dinner'

  // Session Actions
  setActiveSession: (session: 'lunch' | 'dinner') => void

  // Setup Actions
  completeSetup: () => void
  resetSetup: () => void
  resetReservations: () => void

  // Reservation Actions
  addReservation: (data: Omit<Reservation, 'id' | 'status'>) => void
  updateReservation: (id: string, data: Partial<Omit<Reservation, 'id' | 'status'>>) => void
  updateReservationStatus: (id: string, status: Reservation['status']) => void
  removeReservation: (id: string) => void

  // Table Actions
  seatReservation: (reservationId: string, tableId: string) => void
  seatWithAutoMerge: (reservationId: string, tableId: string) => void
  clearTable: (tableId: string) => void
  walkInTable: (tableId: string, partySize: number, name?: string) => void
  moveToTable: (fromTableId: string, toTableId: string) => void
  setNextBooking: (tableId: string, reservationId: string) => void
  clearNextBooking: (tableId: string) => void
  setFocusedTable: (id: string | null) => void

  // Table Edit Actions
  toggleEditMode: () => void
  selectTable: (id: string | null) => void
  toggleSelectTable: (id: string) => void
  moveTable: (id: string, x: number, y: number) => void
  resizeTable: (id: string, width: number, height: number) => void
  updateTable: (id: string, updates: Partial<Pick<TableInfo, 'label' | 'seats'>>) => void
  addTable: () => void
  removeTable: (id: string) => void
  mergeTables: () => void
  splitTable: (id: string) => void
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

export const useReservationStore = create<ReservationStore>()(
  persist(
    (set, get) => ({
      reservations: [],
      tables: [],
      isModalOpen: false,
      isEditMode: false,
      selectedTableIds: [],
      isSetupComplete: false,
      editingReservation: null,
      focusedTableId: null,
      activeSession: 'lunch',

      setActiveSession: (session) => set({ activeSession: session }),

      completeSetup: () =>
        set((state) => ({
          isSetupComplete: true,
          isEditMode: false,
          selectedTableIds: [],
          tables: state.tables.map((t) => ({
            ...t,
            status: 'available' as const,
            currentTeam: null,
            nextBooking: null,
          })),
        })),

      resetSetup: () =>
        set({
          isSetupComplete: false,
          tables: [],
          reservations: [],
          isEditMode: false,
          selectedTableIds: [],
        }),

      resetReservations: () =>
        set((state) => ({
          reservations: [],
          tables: state.tables.map((t) => ({
            ...t,
            status: 'available' as const,
            currentTeam: null,
            nextBooking: null,
          })),
        })),

      addReservation: (data) =>
        set((state) => {
          const id = getNextId(state.reservations, 'r')
          return {
            reservations: [
              ...state.reservations,
              { ...data, id, status: 'waiting' },
            ],
            isModalOpen: false,
            editingReservation: null,
          }
        }),

      updateReservation: (id, data) =>
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === id ? { ...r, ...data } : r
          ),
          tables: state.tables.map((t) => {
            if (t.currentTeam?.reservationId === id) {
              const reservation = state.reservations.find((r) => r.id === id)
              if (reservation) {
                return {
                  ...t,
                  currentTeam: {
                    ...t.currentTeam,
                    name: data.name || reservation.name,
                    partySize: data.partySize || reservation.partySize,
                  },
                }
              }
            }
            if (t.nextBooking?.reservationId === id) {
              const reservation = state.reservations.find((r) => r.id === id)
              if (reservation) {
                return {
                  ...t,
                  nextBooking: {
                    ...t.nextBooking,
                    name: data.name || reservation.name,
                    partySize: data.partySize || reservation.partySize,
                    startTime: data.startTime || reservation.startTime,
                    endTime: data.endTime || reservation.endTime,
                  },
                }
              }
            }
            return t
          }),
          isModalOpen: false,
          editingReservation: null,
        })),

      updateReservationStatus: (id, status) =>
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === id ? { ...r, status } : r
          ),
        })),

      removeReservation: (id) =>
        set((state) => {
          return {
            reservations: state.reservations.filter((r) => r.id !== id),
            tables: state.tables.map((t) => {
              let updated = { ...t }
              if (t.currentTeam?.reservationId === id) {
                updated = { ...updated, status: 'available' as const, currentTeam: null }
              }
              if (t.nextBooking?.reservationId === id) {
                updated = { ...updated, nextBooking: null }
              }
              return updated
            }),
          }
        }),

      seatReservation: (reservationId, tableId) =>
        set((state) => {
          const reservation = state.reservations.find((r) => r.id === reservationId)
          if (!reservation) return state

          const prevTableId = reservation.tableId

          return {
            reservations: state.reservations.map((r) =>
              r.id === reservationId ? { ...r, status: 'seated', tableId } : r
            ),
            tables: state.tables.map((t) => {
              if (prevTableId && t.id === prevTableId) {
                return { ...t, status: 'available' as const, currentTeam: null }
              }
              if (t.id === tableId) {
                return {
                  ...t,
                  status: 'occupied' as const,
                  currentTeam: {
                    reservationId,
                    name: reservation.name,
                    partySize: reservation.partySize,
                    seatedAt: getCurrentTimeHHMM(),
                  },
                  nextBooking: t.nextBooking?.reservationId === reservationId ? null : t.nextBooking,
                }
              }
              return t
            }),
          }
        }),

      seatWithAutoMerge: (reservationId, tableId) => {
        const state = get()
        const reservation = state.reservations.find((r) => r.id === reservationId)
        const table = state.tables.find((t) => t.id === tableId)
        if (!reservation || !table) return

        if (reservation.partySize <= table.seats) {
          // Fits — just seat normally
          set((s) => {
            const prevTableId = reservation.tableId
            return {
              reservations: s.reservations.map((r) =>
                r.id === reservationId ? { ...r, status: 'seated', tableId } : r
              ),
              tables: s.tables.map((t) => {
                if (prevTableId && t.id === prevTableId) {
                  return { ...t, status: 'available' as const, currentTeam: null }
                }
                if (t.id === tableId) {
                  return {
                    ...t,
                    status: 'occupied' as const,
                    currentTeam: {
                      reservationId,
                      name: reservation.name,
                      partySize: reservation.partySize,
                      seatedAt: getCurrentTimeHHMM(),
                    },
                    nextBooking: t.nextBooking?.reservationId === reservationId ? null : t.nextBooking,
                  }
                }
                return t
              }),
            }
          })
          return
        }

        // Need extra seats — find adjacent available tables by number
        const baseNum = getTableNumber(table.label)
        const available = state.tables.filter(
          (t) => t.status === 'available' && t.id !== tableId
        )

        // Build contiguous range outward from baseNum
        const needed = reservation.partySize - table.seats
        let extra = 0
        const toMerge: TableInfo[] = []
        let lo = baseNum - 1
        let hi = baseNum + 1

        while (extra < needed && (lo >= 1 || hi <= 100)) {
          // Try hi first, then lo
          const hiTable = available.find((t) => getTableNumber(t.label) === hi && !toMerge.includes(t))
          if (hiTable) {
            toMerge.push(hiTable)
            extra += hiTable.seats
            if (extra >= needed) break
          }
          const loTable = available.find((t) => getTableNumber(t.label) === lo && !toMerge.includes(t))
          if (loTable) {
            toMerge.push(loTable)
            extra += loTable.seats
            if (extra >= needed) break
          }
          hi++
          lo--
        }

        // Verify contiguity
        const allNums = [baseNum, ...toMerge.map((t) => getTableNumber(t.label))]
        if (extra < needed || !isContiguousRange(allNums)) {
          // Not enough or non-contiguous — seat anyway on original table
          set((s) => ({
            reservations: s.reservations.map((r) =>
              r.id === reservationId ? { ...r, status: 'seated', tableId } : r
            ),
            tables: s.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    status: 'occupied' as const,
                    currentTeam: {
                      reservationId,
                      name: reservation.name,
                      partySize: reservation.partySize,
                      seatedAt: getCurrentTimeHHMM(),
                    },
                    nextBooking: t.nextBooking?.reservationId === reservationId ? null : t.nextBooking,
                  }
                : t
            ),
          }))
          return
        }

        // Merge all selected tables into one, then seat
        const allToMerge = [table, ...toMerge]
        const firstTable = allToMerge.reduce((best, t) =>
          getTableNumber(t.label) < getTableNumber(best.label) ? t : best
        )
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
          const mergedId = getNextId(s.tables, 't')
          const mergedTable: TableInfo = {
            id: mergedId,
            label: mergedLabel,
            shape: 'rectangle',
            seats: totalSeats,
            x: firstTable.x,
            y: firstTable.y,
            width: TABLE_WIDTH,
            height: getTableHeight(totalSeats),
            status: 'occupied',
            currentTeam: {
              reservationId,
              name: reservation.name,
              partySize: reservation.partySize,
              seatedAt: getCurrentTimeHHMM(),
            },
            nextBooking: null,
            mergedFrom: origins,
          }

          const mergeIds = new Set(allToMerge.map((t) => t.id))
          return {
            reservations: s.reservations.map((r) =>
              r.id === reservationId ? { ...r, status: 'seated', tableId: mergedId } : r
            ),
            tables: [
              ...s.tables.filter((t) => !mergeIds.has(t.id)),
              mergedTable,
            ],
          }
        })
      },

      setFocusedTable: (id) => set({ focusedTableId: id }),

      clearTable: (tableId) =>
        set((state) => {
          const table = state.tables.find((t) => t.id === tableId)
          if (!table) return state
          const reservationId = table.currentTeam?.reservationId

          const updatedReservations = reservationId
            ? state.reservations.map((r) =>
                r.id === reservationId ? { ...r, status: 'completed' as const, tableId: undefined } : r
              )
            : state.reservations

          // If merged table, auto-split
          if (table.mergedFrom && table.mergedFrom.length >= 2) {
            const remainingTables = state.tables.filter((t) => t.id !== tableId)
            const existingIds = new Set(remainingTables.map((t) => t.id))

            // Restore individual tables
            const restoredTables: TableInfo[] = table.mergedFrom.map((origin) => {
              let id = origin.id
              let label = origin.label
              if (existingIds.has(id)) {
                const newId = getNextId([...remainingTables, ...restoredTables.filter(Boolean)], 't')
                const num = parseInt(newId.replace('t', ''), 10)
                id = newId
                label = `T${num}`
              }
              return {
                id,
                label,
                shape: 'rectangle' as const,
                seats: origin.seats,
                x: origin.x,
                y: origin.y,
                width: origin.width,
                height: origin.height,
                status: 'available' as const,
                currentTeam: null,
                nextBooking: null,
              }
            })

            // If nextBooking exists, try to re-merge optimal subset
            if (table.nextBooking) {
              const nb = table.nextBooking
              const neededSeats = nb.partySize

              // If targetLabel specified, assign nextBooking to that specific sub-table
              if (nb.targetLabel) {
                const targetRestored = restoredTables.find((t) => t.label === nb.targetLabel)
                if (targetRestored) {
                  targetRestored.nextBooking = nb
                }
                return {
                  tables: [...remainingTables, ...restoredTables],
                  reservations: updatedReservations,
                }
              }

              // Find minimum contiguous subset that covers neededSeats
              const nums = restoredTables.map((t) => getTableNumber(t.label)).sort((a, b) => a - b)
              let bestCombo: number[] | null = null
              for (let start = 0; start < nums.length; start++) {
                let seats = 0
                const combo: number[] = []
                for (let end = start; end < nums.length; end++) {
                  const rt = restoredTables.find((t) => getTableNumber(t.label) === nums[end])
                  if (rt) {
                    seats += rt.seats
                    combo.push(nums[end])
                  }
                  if (seats >= neededSeats) {
                    if (!bestCombo || combo.length < bestCombo.length) {
                      bestCombo = [...combo]
                    }
                    break
                  }
                }
              }

              if (bestCombo && bestCombo.length >= 2 && isContiguousRange(bestCombo)) {
                // Re-merge the subset
                const mergeTargets = restoredTables.filter((t) => bestCombo!.includes(getTableNumber(t.label)))
                const keepTables = restoredTables.filter((t) => !bestCombo!.includes(getTableNumber(t.label)))
                const reMergedId = getNextId([...remainingTables, ...restoredTables], 't')
                const firstT = mergeTargets.reduce((best, t) =>
                  getTableNumber(t.label) < getTableNumber(best.label) ? t : best
                )
                const totalSeats = mergeTargets.reduce((sum, t) => sum + t.seats, 0)
                const reMerged: TableInfo = {
                  id: reMergedId,
                  label: getMergeLabel(bestCombo),
                  shape: 'rectangle',
                  seats: totalSeats,
                  x: firstT.x,
                  y: firstT.y,
                  width: TABLE_WIDTH,
                  height: getTableHeight(totalSeats),
                  status: 'available',
                  currentTeam: null,
                  nextBooking: nb,
                  mergedFrom: mergeTargets.map((t) => ({
                    id: t.id, label: t.label, seats: t.seats,
                    x: t.x, y: t.y, width: t.width, height: t.height,
                  })),
                }
                return {
                  tables: [...remainingTables, ...keepTables, reMerged],
                  reservations: updatedReservations,
                }
              }

              // Single table can cover — just assign nextBooking
              if (bestCombo && bestCombo.length === 1) {
                const target = restoredTables.find((t) => getTableNumber(t.label) === bestCombo![0])
                if (target) target.nextBooking = nb
              }
            }

            return {
              tables: [...remainingTables, ...restoredTables],
              reservations: updatedReservations,
            }
          }

          // Non-merged table — simple clear
          return {
            tables: state.tables.map((t) =>
              t.id === tableId
                ? { ...t, status: 'available' as const, currentTeam: null }
                : t
            ),
            reservations: updatedReservations,
          }
        }),

      walkInTable: (tableId, partySize, name) =>
        set((state) => {
          const table = state.tables.find((t) => t.id === tableId)
          if (!table || table.status !== 'available') return state

          const displayName = name || '워크인'
          return {
            tables: state.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    status: 'occupied' as const,
                    currentTeam: {
                      name: displayName,
                      partySize,
                      seatedAt: getCurrentTimeHHMM(),
                    },
                  }
                : t
            ),
          }
        }),

      moveToTable: (fromTableId, toTableId) =>
        set((state) => {
          const fromTable = state.tables.find((t) => t.id === fromTableId)
          const toTable = state.tables.find((t) => t.id === toTableId)
          if (!fromTable || !toTable) return state
          if (fromTable.status !== 'occupied' || toTable.status !== 'available') return state

          return {
            tables: state.tables.map((t) => {
              if (t.id === fromTableId) {
                return { ...t, status: 'available' as const, currentTeam: null }
              }
              if (t.id === toTableId) {
                return {
                  ...t,
                  status: 'occupied' as const,
                  currentTeam: fromTable.currentTeam,
                }
              }
              return t
            }),
            reservations: fromTable.currentTeam?.reservationId
              ? state.reservations.map((r) =>
                  r.id === fromTable.currentTeam!.reservationId ? { ...r, tableId: toTableId } : r
                )
              : state.reservations,
          }
        }),

      setNextBooking: (tableId, reservationId) =>
        set((state) => {
          const reservation = state.reservations.find((r) => r.id === reservationId)
          if (!reservation) return state

          return {
            tables: state.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    nextBooking: {
                      reservationId,
                      name: reservation.name,
                      partySize: reservation.partySize,
                      startTime: reservation.startTime,
                      endTime: reservation.endTime,
                    },
                  }
                : t
            ),
          }
        }),

      clearNextBooking: (tableId) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, nextBooking: null } : t
          ),
        })),

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
          tables: state.tables.map((t) => {
            if (t.id !== id) return t
            const newTable = { ...t, ...updates }
            if (updates.seats !== undefined) {
              newTable.height = getTableHeight(updates.seats)
            }
            return newTable
          }),
        })),

      addTable: () =>
        set((state) => {
          const id = getNextId(state.tables, 't')
          const num = parseInt(id.replace('t', ''), 10)
          const newW = TABLE_WIDTH
          const newH = getTableHeight(2)

          // Find non-overlapping position
          const maxX = state.tables.length > 0
            ? Math.max(...state.tables.map(t => t.x + t.width)) : 0
          const maxY = state.tables.length > 0
            ? Math.max(...state.tables.map(t => t.y + t.height)) : 0

          let newX = snapToGrid(maxX + SNAP_SIZE * 2)
          let newY = snapToGrid(Math.max(0, maxY - newH))

          const overlaps = (x: number, y: number, w: number, h: number) =>
            state.tables.some(t =>
              x < t.x + t.width && x + w > t.x &&
              y < t.y + t.height && y + h > t.y
            )

          while (overlaps(newX, newY, newW, newH)) {
            newY = snapToGrid(newY + newH + SNAP_SIZE * 2)
          }

          const newTable: TableInfo = {
            id,
            label: `T${num}`,
            shape: 'rectangle',
            seats: 2,
            x: newX,
            y: newY,
            width: newW,
            height: newH,
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
        set((state) => ({
          tables: state.tables.filter((t) => t.id !== id),
          selectedTableIds: state.selectedTableIds.filter((tid) => tid !== id),
        })),

      mergeTables: () =>
        set((state) => {
          if (state.selectedTableIds.length < 2) return state

          const selected = state.tables.filter((t) =>
            state.selectedTableIds.includes(t.id)
          )
          if (selected.length < 2) return state
          if (selected.some((t) => t.status !== 'available')) return state

          // Contiguity check
          const nums = selected.map((t) => getTableNumber(t.label))
          if (!isContiguousRange(nums)) return state

          const totalSeats = selected.reduce((sum, t) => sum + t.seats, 0)

          // Store original table info for split restoration
          const origins: MergedOrigin[] = selected.map((t) => ({
            id: t.id,
            label: t.label,
            seats: t.seats,
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height,
          }))

          // Use first-numbered table's position
          const firstTable = selected.reduce((best, t) =>
            getTableNumber(t.label) < getTableNumber(best.label) ? t : best
          )

          const mergedId = getNextId(state.tables, 't')
          const mergedTable: TableInfo = {
            id: mergedId,
            label: getMergeLabel(nums),
            shape: 'rectangle',
            seats: totalSeats,
            x: firstTable.x,
            y: firstTable.y,
            width: TABLE_WIDTH,
            height: getTableHeight(totalSeats),
            status: 'available',
            currentTeam: null,
            nextBooking: null,
            mergedFrom: origins,
          }

          const selectedIds = new Set(state.selectedTableIds)
          return {
            tables: [
              ...state.tables.filter((t) => !selectedIds.has(t.id)),
              mergedTable,
            ],
            selectedTableIds: [mergedId],
          }
        }),

      splitTable: (id) =>
        set((state) => {
          const table = state.tables.find((t) => t.id === id)
          if (!table || !table.mergedFrom || table.mergedFrom.length < 2) return state
          if (table.status !== 'available') return state

          // Restore original tables from mergedFrom
          const restoredTables: TableInfo[] = table.mergedFrom.map((origin) => ({
            id: origin.id,
            label: origin.label,
            shape: 'rectangle' as const,
            seats: origin.seats,
            x: origin.x,
            y: origin.y,
            width: origin.width,
            height: origin.height,
            status: 'available' as const,
            currentTeam: null,
            nextBooking: null,
          }))

          const remainingTables = state.tables.filter((t) => t.id !== id)

          // Check for ID conflicts and reassign if needed
          const existingIds = new Set(remainingTables.map((t) => t.id))
          const finalTables = restoredTables.map((t) => {
            if (existingIds.has(t.id)) {
              const newId = getNextId([...remainingTables, ...restoredTables], 't')
              const num = parseInt(newId.replace('t', ''), 10)
              return { ...t, id: newId, label: `T${num}` }
            }
            return t
          })

          return {
            tables: [...remainingTables, ...finalTables],
            selectedTableIds: finalTables.map((t) => t.id),
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
              state.selectedTableIds.includes(t.id)
                ? { ...t, y: snapToGrid(minY) }
                : t
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
              state.selectedTableIds.includes(t.id)
                ? { ...t, x: snapToGrid(minX) }
                : t
            ),
          }
        }),

      openModal: (reservation) => set({
        isModalOpen: true,
        editingReservation: reservation || null,
      }),
      closeModal: () => set({
        isModalOpen: false,
        editingReservation: null,
      }),
    }),
    {
      name: 'namou-storage',
      version: 4,
      migrate: (persisted: any, version: number) => {
        const state = persisted as any
        if (version < 2) {
          // Migrate v1 → v2: reservation/reservationId → currentTeam/nextBooking
          if (state.tables) {
            state.tables = state.tables.map((t: any) => {
              const currentTeam: CurrentTeam | null = t.status === 'occupied' && t.reservation
                ? {
                    reservationId: t.reservationId || undefined,
                    name: t.reservation.replace(/\s*\(\d+명\)$/, ''),
                    partySize: parseInt(t.reservation.match(/\((\d+)명\)/)?.[1] || '2', 10),
                    seatedAt: getCurrentTimeHHMM(),
                  }
                : null

              const { reservation, reservationId, ...rest } = t
              return { ...rest, currentTeam, nextBooking: null }
            })
          }
        }
        if (version < 3) {
          // Migrate v2 → v3: mergedFrom string[] → MergedOrigin[]
          if (state.tables) {
            state.tables = state.tables.map((t: any) => {
              if (t.mergedFrom && Array.isArray(t.mergedFrom) && typeof t.mergedFrom[0] === 'string') {
                t.mergedFrom = t.mergedFrom.map((id: string, i: number) => ({
                  id,
                  label: `T${id.replace('t', '')}`,
                  seats: Math.max(1, Math.floor((t.seats || 2) / t.mergedFrom.length)),
                  x: snapToGrid(t.x + i * (TABLE_WIDTH + 12)),
                  y: t.y,
                  width: TABLE_WIDTH,
                  height: getTableHeight(Math.max(1, Math.floor((t.seats || 2) / t.mergedFrom.length))),
                }))
              }
              return t
            })
          }
        }
        if (version < 4) {
          // Migrate v3 → v4: add activeSession
          state.activeSession = state.activeSession || 'lunch'
        }
        return persisted
      },
      partialize: (state) => ({
        tables: state.tables,
        reservations: state.reservations,
        isSetupComplete: state.isSetupComplete,
        activeSession: state.activeSession,
      }),
    }
  )
)
