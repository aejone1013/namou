import { beforeEach, describe, expect, test } from 'vitest'
import { useReservationStore } from './useReservationStore'
import { createDefaultTables } from '@/data/dummy'
import type { SessionData } from '@/data/dummy'

function emptySessionData(): { lunch: SessionData; dinner: SessionData } {
  return {
    lunch: { tableStates: {}, merges: [] },
    dinner: { tableStates: {}, merges: [] },
  }
}

function resetStore() {
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

function addReservation(params: {
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

describe('useReservationStore integration (multi planned bookings)', () => {
  beforeEach(() => {
    resetStore()
  })

  test('preserves and auto-seats split future bookings after clearing merged occupied table (A/B/C scenario)', () => {
    const store = useReservationStore.getState()

    const A = addReservation({ name: 'A', partySize: 6, startTime: '19:00', endTime: '20:30' })
    const B = addReservation({ name: 'B', partySize: 3, startTime: '20:30', endTime: '22:00' })
    const C = addReservation({ name: 'C', partySize: 2, startTime: '20:30', endTime: '22:00' })

    store.setNextBookingMulti(['t1', 't2', 't3'], A.id, 'T1-3')
    store.setNextBookingMulti(['t1', 't2'], B.id, 'T1-2')
    store.setNextBookingMulti(['t3'], C.id, 'T3')

    store.seatWithSelectedMerge(A.id, 't1', ['t2', 't3'])

    const afterSeat = useReservationStore.getState()
    const occupiedMerged = afterSeat.getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(occupiedMerged).toBeTruthy()

    afterSeat.clearTable(occupiedMerged!.id)

    const finalState = useReservationStore.getState()
    const finalTables = finalState.getEffectiveTables()
    const resB = finalState.reservations.find((r) => r.id === B.id)
    const resC = finalState.reservations.find((r) => r.id === C.id)

    expect(resB?.status).toBe('seated')
    expect(resC?.status).toBe('seated')

    const bTable = finalTables.find((t) => t.currentTeam?.reservationId === B.id)
    const cTable = finalTables.find((t) => t.currentTeam?.reservationId === C.id)

    expect(bTable).toBeTruthy()
    expect(cTable).toBeTruthy()
    expect(bTable?.label).toBe('T1-2')
    expect(cTable?.label).toBe('T3')
  })

  test('blocks overlapping-time assignment on same table scope but allows non-overlapping later booking', () => {
    const store = useReservationStore.getState()

    const A = addReservation({ name: 'A', partySize: 2, startTime: '19:00', endTime: '20:30' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '20:00', endTime: '21:30' })
    const C = addReservation({ name: 'C', partySize: 2, startTime: '20:30', endTime: '22:00' })

    store.setNextBookingMulti(['t1'], A.id, 'T1')

    // Overlapping B on same table should be rejected by store conflict rule.
    store.setNextBookingMulti(['t1'], B.id, 'T1')
    let tableState = useReservationStore.getState().sessionData.dinner.tableStates.t1
    let planned = tableState?.plannedBookings ?? []
    expect(planned.map((b) => b.reservationId)).toEqual([A.id])

    // Non-overlapping C should be accepted and queued.
    store.setNextBookingMulti(['t1'], C.id, 'T1')
    tableState = useReservationStore.getState().sessionData.dinner.tableStates.t1
    planned = tableState?.plannedBookings ?? []
    expect(planned.map((b) => b.reservationId)).toEqual([A.id, C.id])
  })

  test('changing planned assignment clears previous scoped assignment and applies new merged scope', () => {
    const store = useReservationStore.getState()

    const D = addReservation({ name: 'D', partySize: 3, startTime: '20:30', endTime: '22:00' })

    store.setNextBookingMulti(['t1', 't2'], D.id, 'T1-2')
    let dinnerStates = useReservationStore.getState().sessionData.dinner.tableStates
    expect(dinnerStates.t1?.plannedBookings?.some((b) => b.reservationId === D.id)).toBe(true)
    expect(dinnerStates.t2?.plannedBookings?.some((b) => b.reservationId === D.id)).toBe(true)

    // Simulate "변경" flow: clear old assignment then assign to different scope.
    store.clearNextBookingByReservation(D.id)
    store.setNextBookingMulti(['t3', 't4'], D.id, 'T3-4')

    dinnerStates = useReservationStore.getState().sessionData.dinner.tableStates
    expect(dinnerStates.t1?.plannedBookings?.some((b) => b.reservationId === D.id) ?? false).toBe(false)
    expect(dinnerStates.t2?.plannedBookings?.some((b) => b.reservationId === D.id) ?? false).toBe(false)
    expect(dinnerStates.t3?.plannedBookings?.some((b) => b.reservationId === D.id)).toBe(true)
    expect(dinnerStates.t4?.plannedBookings?.some((b) => b.reservationId === D.id)).toBe(true)
  })

  test('same-start overlapping scopes auto-seat only one reservation after merged table clear', () => {
    const store = useReservationStore.getState()

    const A = addReservation({ name: 'A', partySize: 6, startTime: '19:00', endTime: '20:30' })
    const B = addReservation({ name: 'B', partySize: 4, startTime: '20:30', endTime: '22:00' })
    const C = addReservation({ name: 'C', partySize: 2, startTime: '20:30', endTime: '22:00' })

    store.setNextBookingMulti(['t1', 't2', 't3'], A.id, 'T1-3')
    store.setNextBookingMulti(['t1', 't2', 't3'], B.id, 'T1-3')
    store.setNextBookingMulti(['t3'], C.id, 'T3')

    store.seatWithSelectedMerge(A.id, 't1', ['t2', 't3'])
    const merged = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(merged).toBeTruthy()

    useReservationStore.getState().clearTable(merged!.id)

    const final = useReservationStore.getState()
    const resB = final.reservations.find((r) => r.id === B.id)
    const resC = final.reservations.find((r) => r.id === C.id)

    const seatedCount = [resB, resC].filter((r) => r?.status === 'seated').length
    expect(seatedCount).toBe(1)
    expect([resB?.status, resC?.status].sort()).toEqual(['seated', 'waiting'])
  })

  test('allows assigning B/C after A is already seated on merged table and auto-seats both on clear', () => {
    const store = useReservationStore.getState()

    const A = addReservation({ name: 'A', partySize: 6, startTime: '19:00', endTime: '20:30' })
    const B = addReservation({ name: 'B', partySize: 3, startTime: '20:30', endTime: '22:00' })
    const C = addReservation({ name: 'C', partySize: 2, startTime: '20:30', endTime: '22:00' })

    // A is seated first on merged T1-3.
    store.seatWithSelectedMerge(A.id, 't1', ['t2', 't3'])
    const merged = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(merged).toBeTruthy()

    // Then assign future bookings while merged table is occupied.
    store.setNextBookingMulti(['t1', 't2'], B.id, 'T1-2')
    store.setNextBookingMulti(['t3'], C.id, 'T3')

    const stateAfterAssign = useReservationStore.getState()
    const t1Planned = stateAfterAssign.sessionData.dinner.tableStates.t1?.plannedBookings ?? []
    const t2Planned = stateAfterAssign.sessionData.dinner.tableStates.t2?.plannedBookings ?? []
    const t3Planned = stateAfterAssign.sessionData.dinner.tableStates.t3?.plannedBookings ?? []
    expect(t1Planned.some((b) => b.reservationId === B.id)).toBe(true)
    expect(t2Planned.some((b) => b.reservationId === B.id)).toBe(true)
    expect(t3Planned.some((b) => b.reservationId === C.id)).toBe(true)

    stateAfterAssign.clearTable(merged!.id)

    const finalState = useReservationStore.getState()
    const seatedB = finalState.reservations.find((r) => r.id === B.id)
    const seatedC = finalState.reservations.find((r) => r.id === C.id)
    expect(seatedB?.status).toBe('seated')
    expect(seatedC?.status).toBe('seated')
  })

  test('does not overwrite existing larger-scope booking when adding another reservation on partial scope', () => {
    const store = useReservationStore.getState()

    const A = addReservation({ name: 'A', partySize: 8, startTime: '19:00', endTime: '20:30' })
    const B = addReservation({ name: 'B', partySize: 3, startTime: '20:30', endTime: '22:00' })

    store.setNextBookingMulti(['t1', 't2', 't3', 't4'], A.id, 'T1-4')
    store.setNextBookingMulti(['t2', 't3'], B.id, 'T2-3')

    const dinnerStates = useReservationStore.getState().sessionData.dinner.tableStates

    for (const id of ['t1', 't2', 't3', 't4']) {
      const planned = dinnerStates[id]?.plannedBookings ?? []
      expect(planned.some((p) => p.reservationId === A.id)).toBe(true)
    }
    for (const id of ['t2', 't3']) {
      const planned = dinnerStates[id]?.plannedBookings ?? []
      expect(planned.some((p) => p.reservationId === B.id)).toBe(true)
    }
  })

  test('keeps future partial booking after seating and clearing earlier full merged booking', () => {
    const store = useReservationStore.getState()

    const A = addReservation({ name: 'A', partySize: 8, startTime: '19:00', endTime: '20:30' })
    const B = addReservation({ name: 'B', partySize: 3, startTime: '20:30', endTime: '22:00' })
    const C = addReservation({ name: 'C', partySize: 2, startTime: '20:30', endTime: '22:00' })

    store.setNextBookingMulti(['t1', 't2', 't3', 't4'], A.id, 'T1-4')
    store.setNextBookingMulti(['t2', 't3'], B.id, 'T2-3')
    store.setNextBookingMulti(['t4'], C.id, 'T4')

    store.seatWithSelectedMerge(A.id, 't1', ['t2', 't3', 't4'])
    const merged = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(merged).toBeTruthy()

    useReservationStore.getState().clearTable(merged!.id)

    const finalState = useReservationStore.getState()
    const resB = finalState.reservations.find((r) => r.id === B.id)
    const resC = finalState.reservations.find((r) => r.id === C.id)

    // Both disjoint scopes at same start should be seated.
    expect(resB?.status).toBe('seated')
    expect(resC?.status).toBe('seated')
  })

  test('supports multi-step undo stack (LIFO)', () => {
    const store = useReservationStore.getState()
    const A = addReservation({ name: 'A', partySize: 2, startTime: '19:00', endTime: '20:30' })

    store.saveUndoSnapshot('before-seat')
    store.seatReservation(A.id, 't1')
    expect(useReservationStore.getState().reservations.find((r) => r.id === A.id)?.status).toBe('seated')

    store.saveUndoSnapshot('before-clear')
    store.clearTable('t1')
    expect(useReservationStore.getState().reservations.find((r) => r.id === A.id)?.status).toBe('completed')

    store.undo()
    expect(useReservationStore.getState().reservations.find((r) => r.id === A.id)?.status).toBe('seated')

    store.undo()
    expect(useReservationStore.getState().reservations.find((r) => r.id === A.id)?.status).toBe('waiting')
  })

  test('blocks same-time assignment on overlapping scope after multi-table booking is already assigned', () => {
    const store = useReservationStore.getState()

    const A = addReservation({ name: 'A', partySize: 6, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 3, startTime: '13:30', endTime: '15:00', period: 'lunch' })
    const C = addReservation({ name: 'C', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setActiveSession('lunch')
    store.setNextBookingMulti(['t1', 't2', 't3'], A.id, 'T1-3')
    store.seatWithSelectedMerge(A.id, 't1', ['t2', 't3'])

    // B assigned to T1-2
    store.setNextBookingMulti(['t1', 't2'], B.id, 'T1-2')
    let dinnerStates = useReservationStore.getState().sessionData.lunch.tableStates
    expect(dinnerStates.t1?.plannedBookings?.some((p) => p.reservationId === B.id)).toBe(true)
    expect(dinnerStates.t2?.plannedBookings?.some((p) => p.reservationId === B.id)).toBe(true)

    // C same time on overlapping scope (T1) should be blocked
    store.setNextBookingMulti(['t1'], C.id, 'T1')
    dinnerStates = useReservationStore.getState().sessionData.lunch.tableStates
    expect(dinnerStates.t1?.plannedBookings?.some((p) => p.reservationId === C.id) ?? false).toBe(false)

    // C same time on non-overlapping scope (T3) should be allowed
    store.setNextBookingMulti(['t3'], C.id, 'T3')
    dinnerStates = useReservationStore.getState().sessionData.lunch.tableStates
    expect(dinnerStates.t3?.plannedBookings?.some((p) => p.reservationId === C.id)).toBe(true)
  })

  test('allows later booking on same scope when times do not overlap', () => {
    const store = useReservationStore.getState()
    const A = addReservation({ name: 'A', partySize: 3, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setActiveSession('lunch')
    store.setNextBookingMulti(['t1', 't2'], A.id, 'T1-2')
    store.setNextBookingMulti(['t1'], B.id, 'T1')

    const lunchStates = useReservationStore.getState().sessionData.lunch.tableStates
    expect(lunchStates.t1?.plannedBookings?.some((p) => p.reservationId === A.id)).toBe(true)
    expect(lunchStates.t1?.plannedBookings?.some((p) => p.reservationId === B.id)).toBe(true)
  })

  test('keeps multiple same-start assignments visible in source table states after merged seat is occupied', () => {
    const store = useReservationStore.getState()
    const A = addReservation({ name: 'A', partySize: 6, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 3, startTime: '13:30', endTime: '15:00', period: 'lunch' })
    const C = addReservation({ name: 'C', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setActiveSession('lunch')
    store.setNextBookingMulti(['t1', 't2', 't3'], A.id, 'T1-3')
    store.seatWithSelectedMerge(A.id, 't1', ['t2', 't3'])
    store.setNextBookingMulti(['t1', 't2'], B.id, 'T1-2')
    store.setNextBookingMulti(['t3'], C.id, 'T3')

    const lunchStates = useReservationStore.getState().sessionData.lunch.tableStates
    const t1 = lunchStates.t1?.plannedBookings ?? []
    const t2 = lunchStates.t2?.plannedBookings ?? []
    const t3 = lunchStates.t3?.plannedBookings ?? []

    expect(t1.some((p) => p.reservationId === B.id)).toBe(true)
    expect(t2.some((p) => p.reservationId === B.id)).toBe(true)
    expect(t3.some((p) => p.reservationId === C.id)).toBe(true)
  })

  test('reassigning reservation to overlapping occupied scope does not wipe existing assignment', () => {
    const store = useReservationStore.getState()
    const A = addReservation({ name: 'A', partySize: 3, startTime: '13:30', endTime: '15:00', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setActiveSession('lunch')
    store.setNextBookingMulti(['t1', 't2'], A.id, 'T1-2')

    // Attempt conflicting assignment for B on T2 should fail
    store.setNextBookingMulti(['t2'], B.id, 'T2')

    const lunchStates = useReservationStore.getState().sessionData.lunch.tableStates
    expect(lunchStates.t1?.plannedBookings?.some((p) => p.reservationId === A.id)).toBe(true)
    expect(lunchStates.t2?.plannedBookings?.some((p) => p.reservationId === A.id)).toBe(true)
    expect(lunchStates.t2?.plannedBookings?.some((p) => p.reservationId === B.id) ?? false).toBe(false)
  })
})
