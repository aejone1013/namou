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
  timeFilter: string | null

  // Setup Actions
  completeSetup: () => void
  resetSetup: () => void
  resetReservations: () => void
  resetTableLayout: () => void

  // Reservation Actions
  addReservation: (data: Omit<Reservation, 'id' | 'status'>) => void
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
      timeFilter: null,

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
      name: 'cozytable-storage',
      partialize: (state) => ({
        tables: state.tables,
        reservations: state.reservations,
        isSetupComplete: state.isSetupComplete,
      }),
    }
  )
)
