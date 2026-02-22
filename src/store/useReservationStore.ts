import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Reservation, TableInfo } from '@/data/dummy'
import { TABLE_WIDTH, getTableHeight, snapToGrid } from '@/data/dummy'

interface ReservationStore {
  // State
  reservations: Reservation[]
  tables: TableInfo[]
  isModalOpen: boolean
  isEditMode: boolean
  selectedTableIds: string[]
  isSetupComplete: boolean
  timeFilter: string | null

  // Setup Actions
  completeSetup: () => void
  resetSetup: () => void
  resetReservations: () => void
  resetTableLayout: () => void

  // Reservation Actions
  addReservation: (data: Omit<Reservation, 'id' | 'status'>) => void
  updateReservation: (id: string, data: Partial<Omit<Reservation, 'id' | 'status'>>) => void
  updateReservationStatus: (id: string, status: Reservation['status']) => void
  removeReservation: (id: string) => void

  // Table Actions
  seatReservation: (reservationId: string, tableId: string) => void
  clearTable: (tableId: string) => void
  moveReservationToTable: (fromTableId: string, toTableId: string) => void

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
  alignTables: (direction: 'left' | 'right' | 'top' | 'bottom' | 'horizontal-center' | 'vertical-center') => void
  distributeTables: (direction: 'horizontal' | 'vertical') => void

  // Time filter
  setTimeFilter: (time: string | null) => void

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
    (set) => ({
      reservations: [],
      tables: [],
      isModalOpen: false,
      isEditMode: false,
      selectedTableIds: [],
      isSetupComplete: false,
      timeFilter: null,

      completeSetup: () =>
        set((state) => ({
          isSetupComplete: true,
          isEditMode: false,
          selectedTableIds: [],
          tables: state.tables.map((t) => ({
            ...t,
            status: 'available' as const,
            reservation: undefined,
            reservationId: undefined,
          })),
        })),

      resetSetup: () =>
        set({
          isSetupComplete: false,
          tables: [],
          reservations: [],
          isEditMode: false,
          selectedTableIds: [],
          timeFilter: null,
        }),

      resetReservations: () =>
        set((state) => ({
          reservations: [],
          timeFilter: null,
          tables: state.tables.map((t) => ({
            ...t,
            status: 'available' as const,
            reservation: undefined,
            reservationId: undefined,
          })),
        })),

      resetTableLayout: () =>
        set({
          isSetupComplete: false,
          tables: [],
          reservations: [],
          isEditMode: false,
          selectedTableIds: [],
          timeFilter: null,
        }),

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
            if (t.reservationId === id) {
              const reservation = state.reservations.find((r) => r.id === id)
              if (reservation) {
                return {
                  ...t,
                  reservation: `${data.name || reservation.name} (${data.partySize || reservation.partySize}명)`,
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
          const reservation = state.reservations.find((r) => r.id === id)
          const updatedTables = reservation
            ? state.tables.map((t) =>
                t.reservationId === id
                  ? { ...t, status: 'available' as const, reservation: undefined, reservationId: undefined }
                  : t
              )
            : state.tables

          return {
            reservations: state.reservations.filter((r) => r.id !== id),
            tables: updatedTables,
          }
        }),

      seatReservation: (reservationId, tableId) =>
        set((state) => {
          const reservation = state.reservations.find((r) => r.id === reservationId)
          if (!reservation) return state

          // 이전 테이블 비우기 (이동 시)
          const prevTableId = reservation.tableId

          return {
            reservations: state.reservations.map((r) =>
              r.id === reservationId ? { ...r, status: 'seated', tableId } : r
            ),
            tables: state.tables.map((t) => {
              // 이전 테이블 비우기
              if (prevTableId && t.id === prevTableId) {
                return { ...t, status: 'available' as const, reservation: undefined, reservationId: undefined }
              }
              // 새 테이블 배정
              if (t.id === tableId) {
                return {
                  ...t,
                  status: 'occupied' as const,
                  reservation: `${reservation.name} (${reservation.partySize}명)`,
                  reservationId,
                }
              }
              return t
            }),
          }
        }),

      clearTable: (tableId) =>
        set((state) => {
          const table = state.tables.find((t) => t.id === tableId)
          const reservationId = table?.reservationId

          return {
            tables: state.tables.map((t) =>
              t.id === tableId
                ? { ...t, status: 'available' as const, reservation: undefined, reservationId: undefined }
                : t
            ),
            reservations: reservationId
              ? state.reservations.map((r) =>
                  r.id === reservationId ? { ...r, status: 'completed', tableId: undefined } : r
                )
              : state.reservations,
          }
        }),

      walkInTable: (tableId, partySize, name) =>
        set((state) => {
          const table = state.tables.find((t) => t.id === tableId)
          if (!table || table.status !== 'available') return state

          const displayName = name || `워크인`
          return {
            tables: state.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    status: 'occupied' as const,
                    reservation: `${displayName} (${partySize}명)`,
                    reservationId: undefined,
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
                return { ...t, status: 'available' as const, reservation: undefined, reservationId: undefined }
              }
              if (t.id === toTableId) {
                return {
                  ...t,
                  status: 'occupied' as const,
                  reservation: fromTable.reservation,
                  reservationId: fromTable.reservationId,
                }
              }
              return t
            }),
            reservations: fromTable.reservationId
              ? state.reservations.map((r) =>
                  r.id === fromTable.reservationId ? { ...r, tableId: toTableId } : r
                )
              : state.reservations,
          }
        }),

      moveReservationToTable: (fromTableId, toTableId) =>
        set((state) => {
          const fromTable = state.tables.find((t) => t.id === fromTableId)
          const toTable = state.tables.find((t) => t.id === toTableId)
          if (!fromTable || !toTable || !fromTable.reservationId) return state
          if (toTable.status !== 'available') return state

          const reservationId = fromTable.reservationId
          const reservation = state.reservations.find((r) => r.id === reservationId)
          if (!reservation) return state

          return {
            tables: state.tables.map((t) => {
              if (t.id === fromTableId) {
                return { ...t, status: 'available' as const, reservation: undefined, reservationId: undefined }
              }
              if (t.id === toTableId) {
                return {
                  ...t,
                  status: 'occupied' as const,
                  reservation: `${reservation.name} (${reservation.partySize}명)`,
                  reservationId,
                }
              }
              return t
            }),
          }
        }),

      // Edit Mode
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
          const newTable: TableInfo = {
            id,
            label: `T${num}`,
            shape: 'rectangle',
            seats: 2,
            x: snapToGrid(120),
            y: snapToGrid(120),
            width: TABLE_WIDTH,
            height: getTableHeight(2),
            status: 'available',
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

          const minX = Math.min(...selected.map((t) => t.x))
          const minY = Math.min(...selected.map((t) => t.y))
          const totalSeats = selected.reduce((sum, t) => sum + t.seats, 0)

          const mergedId = getNextId(state.tables, 't')
          const mergedNum = parseInt(mergedId.replace('t', ''), 10)
          const mergedTable: TableInfo = {
            id: mergedId,
            label: `T${mergedNum}`,
            shape: 'rectangle',
            seats: totalSeats,
            x: minX,
            y: minY,
            width: TABLE_WIDTH,
            height: getTableHeight(totalSeats),
            status: 'available',
            mergedFrom: state.selectedTableIds,
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

      alignTables: (direction) =>
        set((state) => {
          if (state.selectedTableIds.length < 2) return state
          const selected = state.tables.filter((t) => state.selectedTableIds.includes(t.id))
          if (selected.length < 2) return state

          let updates: Record<string, { x?: number; y?: number }> = {}

          switch (direction) {
            case 'left': {
              const minX = Math.min(...selected.map((t) => t.x))
              selected.forEach((t) => { updates[t.id] = { x: minX } })
              break
            }
            case 'right': {
              const maxRight = Math.max(...selected.map((t) => t.x + t.width))
              selected.forEach((t) => { updates[t.id] = { x: maxRight - t.width } })
              break
            }
            case 'top': {
              const minY = Math.min(...selected.map((t) => t.y))
              selected.forEach((t) => { updates[t.id] = { y: minY } })
              break
            }
            case 'bottom': {
              const maxBottom = Math.max(...selected.map((t) => t.y + t.height))
              selected.forEach((t) => { updates[t.id] = { y: maxBottom - t.height } })
              break
            }
            case 'horizontal-center': {
              const centerY = selected.reduce((sum, t) => sum + t.y + t.height / 2, 0) / selected.length
              selected.forEach((t) => { updates[t.id] = { y: Math.round(centerY - t.height / 2) } })
              break
            }
            case 'vertical-center': {
              const centerX = selected.reduce((sum, t) => sum + t.x + t.width / 2, 0) / selected.length
              selected.forEach((t) => { updates[t.id] = { x: Math.round(centerX - t.width / 2) } })
              break
            }
          }

          return {
            tables: state.tables.map((t) =>
              updates[t.id] ? { ...t, ...updates[t.id] } : t
            ),
          }
        }),

      distributeTables: (direction) =>
        set((state) => {
          if (state.selectedTableIds.length < 3) return state
          const selected = state.tables.filter((t) => state.selectedTableIds.includes(t.id))
          if (selected.length < 3) return state

          if (direction === 'horizontal') {
            const sorted = [...selected].sort((a, b) => a.x - b.x)
            const first = sorted[0]
            const last = sorted[sorted.length - 1]
            const totalSpace = (last.x + last.width) - first.x
            const totalWidth = sorted.reduce((sum, t) => sum + t.width, 0)
            const gap = (totalSpace - totalWidth) / (sorted.length - 1)

            let currentX = first.x
            const updates: Record<string, { x: number }> = {}
            sorted.forEach((t) => {
              updates[t.id] = { x: Math.round(currentX) }
              currentX += t.width + gap
            })

            return {
              tables: state.tables.map((t) =>
                updates[t.id] ? { ...t, ...updates[t.id] } : t
              ),
            }
          } else {
            const sorted = [...selected].sort((a, b) => a.y - b.y)
            const first = sorted[0]
            const last = sorted[sorted.length - 1]
            const totalSpace = (last.y + last.height) - first.y
            const totalHeight = sorted.reduce((sum, t) => sum + t.height, 0)
            const gap = (totalSpace - totalHeight) / (sorted.length - 1)

            let currentY = first.y
            const updates: Record<string, { y: number }> = {}
            sorted.forEach((t) => {
              updates[t.id] = { y: Math.round(currentY) }
              currentY += t.height + gap
            })

            return {
              tables: state.tables.map((t) =>
                updates[t.id] ? { ...t, ...updates[t.id] } : t
              ),
            }
          }
        }),

      setTimeFilter: (time) => set({ timeFilter: time }),

      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
    }),
    {
      name: 'namou-storage',
      partialize: (state) => ({
        tables: state.tables,
        reservations: state.reservations,
        isSetupComplete: state.isSetupComplete,
      }),
    }
  )
)
