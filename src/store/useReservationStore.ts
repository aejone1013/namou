import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Reservation, TableInfo } from '@/data/dummy'

interface ReservationStore {
  // State
  reservations: Reservation[]
  tables: TableInfo[]
  isModalOpen: boolean
  isEditMode: boolean
  selectedTableId: string | null
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
  moveTable: (id: string, x: number, y: number) => void
  resizeTable: (id: string, width: number, height: number) => void
  updateTable: (id: string, updates: Partial<Pick<TableInfo, 'label' | 'seats' | 'shape'>>) => void
  addTable: (shape: 'circle' | 'rectangle') => void
  removeTable: (id: string) => void

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
      selectedTableId: null,
      isSetupComplete: false,

      // Setup
      completeSetup: () =>
        set((state) => ({
          isSetupComplete: true,
          isEditMode: false,
          selectedTableId: null,
          // 모든 테이블을 available 상태로 초기화
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
          selectedTableId: null,
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
          selectedTableId: null,
        })),

      selectTable: (id) => set({ selectedTableId: id }),

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

      addTable: (shape) =>
        set((state) => {
          const id = `t${nextTableId++}`
          const isCircle = shape === 'circle'
          const newTable: TableInfo = {
            id,
            label: id.toUpperCase(),
            shape,
            seats: isCircle ? 2 : 4,
            x: 300,
            y: 300,
            width: isCircle ? 100 : 160,
            height: 100,
            status: 'available',
          }
          return {
            tables: [...state.tables, newTable],
            selectedTableId: id,
          }
        }),

      removeTable: (id) =>
        set((state) => ({
          tables: state.tables.filter((t) => t.id !== id),
          selectedTableId: state.selectedTableId === id ? null : state.selectedTableId,
        })),

      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
    }),
    {
      name: 'cozytable-storage',
      // 영속화할 필드만 선택 (UI 상태 제외)
      partialize: (state) => ({
        tables: state.tables,
        reservations: state.reservations,
        isSetupComplete: state.isSetupComplete,
      }),
    }
  )
)
