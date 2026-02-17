import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Reservation, TableInfo } from '@/data/dummy'

interface ReservationStore {
  // State
  reservations: Reservation[]
  tables: TableInfo[]
  isModalOpen: boolean
  isEditMode: boolean
  selectedTableIds: string[]
  isSetupComplete: boolean

  // Setup Actions
  completeSetup: () => void
  resetSetup: () => void

  // Reservation Actions
  addReservation: (data: Omit<Reservation, 'id' | 'status'>) => void
  updateReservationStatus: (id: string, status: Reservation['status']) => void
  removeReservation: (id: string) => void

  // Table Actions
  seatReservation: (reservationId: string, tableId: string) => void
  clearTable: (tableId: string) => void

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

  // Modal Actions
  openModal: () => void
  closeModal: () => void
}

let nextReservationId = 100
let nextTableId = 100

export const useReservationStore = create<ReservationStore>()(
  persist(
    (set) => ({
      reservations: [],
      tables: [],
      isModalOpen: false,
      isEditMode: false,
      selectedTableIds: [],
      isSetupComplete: false,

      // Setup
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
        set((state) => ({
          reservations: [
            ...state.reservations,
            { ...data, id: `r${nextReservationId++}`, status: 'waiting' },
          ],
          isModalOpen: false,
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
            t.id === id ? { ...t, x, y } : t
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
          tables: state.tables.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      addTable: () =>
        set((state) => {
          const id = `t${nextTableId++}`
          const newTable: TableInfo = {
            id,
            label: id.toUpperCase(),
            shape: 'rectangle',
            seats: 4,
            x: 300,
            y: 300,
            width: 160,
            height: 100,
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

          // 병합: bounding box 계산
          const minX = Math.min(...selected.map((t) => t.x))
          const minY = Math.min(...selected.map((t) => t.y))
          const maxX = Math.max(...selected.map((t) => t.x + t.width))
          const maxY = Math.max(...selected.map((t) => t.y + t.height))
          const totalSeats = selected.reduce((sum, t) => sum + t.seats, 0)

          const mergedId = `t${nextTableId++}`
          const mergedTable: TableInfo = {
            id: mergedId,
            label: selected.map((t) => t.label).join('+'),
            shape: 'rectangle',
            seats: totalSeats,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            status: 'available',
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

      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
    }),
    {
      name: 'cozytable-storage',
      partialize: (state) => ({
        tables: state.tables,
        reservations: state.reservations,
        isSetupComplete: state.isSetupComplete,
      }),
    }
  )
)
