import { beforeEach, describe, expect, test } from 'vitest'
import { useReservationStore } from './useReservationStore'
import { addReservation, resetStore, emptySessionData } from './useReservationStore.integration.helpers'
import { createDefaultTables } from '@/data/dummy'

describe('useReservationStore integration (merge)', () => {
  beforeEach(() => {
    resetStore()
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

  test('seatWithSelectedMerge rejects non-contiguous table selection', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })

    // T1 + T3 is non-contiguous, so merge seat must be rejected.
    store.seatWithSelectedMerge(A.id, 't1', ['t3'])

    const state = useReservationStore.getState()
    const seated = state.reservations.find((r) => r.id === A.id)
    expect(seated?.status).toBe('waiting')
    expect(state.sessionData.lunch.merges.length).toBe(0)
  })

  test('seatWithSelectedMerge rejects selection when a target table is already occupied', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })

    // Occupy t2 first, then try to merge A onto t1+t2.
    store.walkInTable('t2', 2, 'BlockT2')
    store.seatWithSelectedMerge(A.id, 't1', ['t2'])

    const state = useReservationStore.getState()
    const seated = state.reservations.find((r) => r.id === A.id)
    expect(seated?.status).toBe('waiting')
    expect(state.sessionData.lunch.merges.length).toBe(0)
  })

  test('moveToTable auto-merges destination when party exceeds target seats', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })

    store.seatWithSelectedMerge(A.id, 't1', ['t2'])
    const beforeMove = useReservationStore.getState()
    const current = beforeMove.getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(current).toBeTruthy()

    // Move to a 2-seat base table; should auto-merge with an adjacent available table.
    beforeMove.moveToTable(current!.id, 't3')

    const after = useReservationStore.getState()
    const moved = after.getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(moved).toBeTruthy()
    expect((moved?.mergedFrom?.length ?? 1) >= 2).toBe(true)
    expect(after.reservations.find((r) => r.id === A.id)?.tableId).toBe(moved?.id)
  })

  test('resetSetup restores default layout and clears session merge state', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    store.seatWithSelectedMerge(A.id, 't1', ['t2'])
    store.addTable()
    expect(useReservationStore.getState().tables.length).toBeGreaterThan(createDefaultTables().length)

    store.resetSetup()
    const after = useReservationStore.getState()
    expect(after.tables.length).toBe(createDefaultTables().length)
    expect(after.sessionData.lunch.merges.length).toBe(0)
    expect(after.reservations.length).toBe(0)
  })

  test('removeTable clears affected merged seating and returns reservation to waiting', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    store.seatWithSelectedMerge(A.id, 't1', ['t2'])

    store.removeTable('t1')
    const after = useReservationStore.getState()
    expect(after.tables.some((t) => t.id === 't1')).toBe(false)
    expect(after.reservations.find((r) => r.id === A.id)?.status).toBe('waiting')
    expect(after.reservations.find((r) => r.id === A.id)?.tableId).toBeUndefined()
  })

  test('persist stores merged session state and rehydrate restores it (app restart simulation)', async () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'PersistA', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    store.seatWithSelectedMerge(A.id, 't1', ['t2'])

    const raw = window.localStorage.getItem('namou-storage')
    expect(raw).toBeTruthy()
    const parsed = raw ? JSON.parse(raw) : null
    expect(parsed?.state?.sessionData?.lunch?.merges?.length).toBeGreaterThanOrEqual(1)

    // Simulate in-memory loss, then rehydrate from persisted storage.
    useReservationStore.setState({
      reservations: [],
      tables: createDefaultTables(),
      sessionData: emptySessionData(),
      activeSession: 'lunch',
    })
    if (raw) {
      window.localStorage.setItem('namou-storage', raw)
    }
    await (useReservationStore as unknown as { persist?: { rehydrate?: () => Promise<void> } }).persist?.rehydrate?.()

    const restored = useReservationStore.getState()
    expect(restored.sessionData.lunch.merges.length).toBeGreaterThanOrEqual(1)
    expect(restored.reservations.some((r) => r.name === 'PersistA')).toBe(true)
  })

  test('seatWithAutoMerge seats large reservation by creating merged table', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'AutoMergeA', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })

    store.seatWithAutoMerge(A.id, 't1')

    const state = useReservationStore.getState()
    const seated = state.getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(seated).toBeTruthy()
    expect(seated?.mergedFrom?.map((o) => o.id).sort()).toEqual(['t1', 't2'])
    expect(state.reservations.find((r) => r.id === A.id)?.status).toBe('seated')
  })

  test('seatWithAutoMerge leaves reservation waiting when adjacent seats are insufficient', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'TooLarge', partySize: 10, startTime: '12:00', endTime: '13:30', period: 'lunch' })

    // Block all neighbors in T1 group so auto-merge cannot be formed.
    for (const id of ['t2', 't3', 't4', 't5', 't6', 't7']) {
      store.walkInTable(id, 2, `Block-${id}`)
    }
    store.seatWithAutoMerge(A.id, 't1')

    const state = useReservationStore.getState()
    expect(state.reservations.find((r) => r.id === A.id)?.status).toBe('waiting')
    expect(state.getEffectiveTables().some((t) => t.currentTeam?.reservationId === A.id)).toBe(false)
  })

  test('updateReservation shrinks merged seated reservation to single table when party size decreases', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'ShrinkA', partySize: 3, startTime: '19:00', endTime: '20:30', period: 'lunch' })

    store.seatWithSelectedMerge(A.id, 't1', ['t2'])
    const before = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(before?.mergedFrom?.map((o) => o.id).sort()).toEqual(['t1', 't2'])

    store.updateReservation(A.id, { partySize: 2 })

    const afterState = useReservationStore.getState()
    const after = afterState.getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(after).toBeTruthy()
    expect(after?.mergedFrom).toBeUndefined()
    expect(afterState.reservations.find((r) => r.id === A.id)?.partySize).toBe(2)
  })

  test('newly added tables can merge within the same column', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    store.addTable()
    store.addTable()
    const A = addReservation({ name: 'ColMerge', partySize: 4, startTime: '19:00', endTime: '20:30', period: 'lunch' })

    store.seatWithSelectedMerge(A.id, 't17', ['t18'])

    const seated = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(seated).toBeTruthy()
    expect(seated?.mergedFrom?.map((o) => o.id).sort()).toEqual(['t17', 't18'])
  })

})
