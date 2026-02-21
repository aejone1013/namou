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
  editingReservation: Reservation | null

  // Setup Actions
  completeSetup: () => void
  resetSetup: () => void

  // Reservation Actions
  addReservation: (data: Omit<Reservation, 'id' | 'status'>) => void
  updateReservation: (id: string, data: Partial<Omit<Reservation, 'id' | 'status'>>) => void
  updateReservationStatus: (id: string, status: Reservation['status']) => void
  removeReservation: (id: string) => void

  // Table Actions
  seatReservation: (reservationId: string, tableId: string) => void
  clearTable: (tableId: string) => void
  walkInTable: (tableId: string, partySize: number, name?: string) => void

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
      editingReservation: null,

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

          return {
            reservations: state.reservations.map((r) =>
              r.id === reservationId ? { ...r, status: 'seated' } : r
            ),
            tables: state.tables.map((t) =>
              t.id === tableId
                ? {
                    ...t,
                    status: 'occupied' as const,
                    reservation: `${reservation.name} (${reservation.partySize}명)`,
                    reservationId,
                  }
                : t
            ),
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
                  r.id === reservationId ? { ...r, status: 'completed' } : r
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

      splitTable: (id) =>
        set((state) => {
          const table = state.tables.find((t) => t.id === id)
          if (!table || !table.mergedFrom || table.mergedFrom.length < 2) return state
          if (table.status !== 'available') return state

          const splitCount = table.mergedFrom.length
          const seatsEach = Math.max(1, Math.floor(table.seats / splitCount))

          const newTables: TableInfo[] = table.mergedFrom.map((_, i) => {
            const newId = getNextId([...state.tables, ...Array(i).fill({ id: `t${999 + i}` })], 't')
            const newNum = parseInt(newId.replace('t', ''), 10) + i
            return {
              id: `t${newNum}`,
              label: `T${newNum}`,
              shape: 'rectangle' as const,
              seats: seatsEach,
              x: snapToGrid(table.x + i * (TABLE_WIDTH + 12)),
              y: table.y,
              width: TABLE_WIDTH,
              height: getTableHeight(seatsEach),
              status: 'available' as const,
            }
          })

          return {
            tables: [
              ...state.tables.filter((t) => t.id !== id),
              ...newTables,
            ],
            selectedTableIds: newTables.map((t) => t.id),
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
      partialize: (state) => ({
        tables: state.tables,
        reservations: state.reservations,
        isSetupComplete: state.isSetupComplete,
      }),
    }
  )
)
