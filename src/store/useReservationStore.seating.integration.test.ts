import { beforeEach, describe, expect, test } from 'vitest'
import { useReservationStore } from './useReservationStore'
import { addReservation, resetStore } from './useReservationStore.integration.helpers'

describe('useReservationStore integration (seating)', () => {
  beforeEach(() => {
    resetStore()
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

  test('undo branching: after undo, new action creates new branch and old future state is not restored', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    store.saveUndoSnapshot('s0')
    store.walkInTable('t1', 2, 'A1')
    store.saveUndoSnapshot('s1')
    store.walkInTable('t2', 2, 'A2')
    expect(useReservationStore.getState().getEffectiveTables().find((t) => t.id === 't2')?.currentTeam?.name).toBe('A2')

    // Go back to s1 (before A2), then create new branch with A3.
    store.undo()
    expect(useReservationStore.getState().getEffectiveTables().find((t) => t.id === 't2')?.currentTeam).toBeNull()
    store.saveUndoSnapshot('s1-branch')
    store.walkInTable('t3', 2, 'A3')

    // Undo should now go to s1-branch snapshot (before A3), not resurrect A2.
    store.undo()
    const state = useReservationStore.getState()
    expect(state.getEffectiveTables().find((t) => t.id === 't2')?.currentTeam).toBeNull()
    expect(state.getEffectiveTables().find((t) => t.id === 't3')?.currentTeam).toBeNull()
  })

  test('resetReservations clears reservations/sessionData but keeps table layout', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    store.seatWithSelectedMerge(A.id, 't1', ['t2'])
    const beforeCount = useReservationStore.getState().tables.length

    store.resetReservations()

    const after = useReservationStore.getState()
    expect(after.reservations.length).toBe(0)
    expect(after.sessionData.lunch.merges.length).toBe(0)
    expect(after.sessionData.dinner.merges.length).toBe(0)
    expect(after.tables.length).toBe(beforeCount)
  })

  test('seatReservation reseating moves reservation and frees previous table', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 2, startTime: '12:00', endTime: '13:30', period: 'lunch' })

    store.seatReservation(A.id, 't1')
    store.seatReservation(A.id, 't3')

    const tables = useReservationStore.getState().getEffectiveTables()
    expect(tables.find((t) => t.id === 't1')?.status).toBe('available')
    expect(tables.find((t) => t.id === 't3')?.currentTeam?.reservationId).toBe(A.id)
    expect(useReservationStore.getState().reservations.find((r) => r.id === A.id)?.tableId).toBe('t3')
  })

  test('moveToTable to occupied target is rejected without state changes', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 2, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '12:00', endTime: '13:30', period: 'lunch' })

    store.seatReservation(A.id, 't1')
    store.seatReservation(B.id, 't2')
    store.moveToTable('t1', 't2')

    const state = useReservationStore.getState()
    expect(state.getEffectiveTables().find((t) => t.id === 't1')?.currentTeam?.reservationId).toBe(A.id)
    expect(state.getEffectiveTables().find((t) => t.id === 't2')?.currentTeam?.reservationId).toBe(B.id)
    expect(state.reservations.find((r) => r.id === A.id)?.tableId).toBe('t1')
  })

})
