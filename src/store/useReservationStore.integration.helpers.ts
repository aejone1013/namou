import { useReservationStore } from './useReservationStore'
import { createDefaultTables } from '@/data/dummy'
import type { SessionData } from '@/data/dummy'

export function emptySessionData(): { lunch: SessionData; dinner: SessionData } {
  return {
    lunch: { tableStates: {}, merges: [] },
    dinner: { tableStates: {}, merges: [] },
  }
}

export function resetStore() {
  ;(useReservationStore as unknown as { persist?: { clearStorage?: () => void } }).persist?.clearStorage?.()
  useReservationStore.setState({
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
    activeSession: 'dinner',
    _undoSnapshot: null,
    _undoLabel: null,
    _undoStack: [],
  })
}

export function addReservation(params: {
  name: string
  partySize: number
  startTime: string
  endTime: string
  period?: 'lunch' | 'dinner'
}) {
  useReservationStore.getState().addReservation({
    name: params.name,
    partySize: params.partySize,
    startTime: params.startTime,
    endTime: params.endTime,
    period: params.period ?? 'dinner',
    phone: '',
    note: '',
  })
  const r = useReservationStore.getState().reservations.find((x) => x.name === params.name)
  if (!r) throw new Error(`Reservation ${params.name} not found`)
  return r
}
