import { beforeEach, describe, expect, test } from 'vitest'
import { useReservationStore } from './useReservationStore'
import { addReservation, resetStore } from './useReservationStore.integration.helpers'

describe('useReservationStore integration (assignment)', () => {
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

  test('shrinks merged assignment when party size decreases and allows selecting either single table', () => {
    const store = useReservationStore.getState()
    const A = addReservation({ name: 'A', partySize: 3, startTime: '19:00', endTime: '20:30' })

    store.setNextBookingMulti(['t1', 't2'], A.id, 'T1-2')
    store.updateReservation(A.id, { partySize: 2 })

    let dinnerStates = useReservationStore.getState().sessionData.dinner.tableStates
    const t1Has = dinnerStates.t1?.plannedBookings?.some((b) => b.reservationId === A.id) ?? false
    const t2Has = dinnerStates.t2?.plannedBookings?.some((b) => b.reservationId === A.id) ?? false
    expect(t1Has || t2Has).toBe(true)
    expect(t1Has && t2Has).toBe(false)

    // Operator can still choose the other single table explicitly.
    store.clearNextBookingByReservation(A.id)
    store.setNextBooking('t2', A.id)
    dinnerStates = useReservationStore.getState().sessionData.dinner.tableStates
    expect(dinnerStates.t1?.plannedBookings?.some((b) => b.reservationId === A.id) ?? false).toBe(false)
    expect(dinnerStates.t2?.plannedBookings?.some((b) => b.reservationId === A.id)).toBe(true)
  })

  test('store rejects addReservation when duration is outside 1~2 hours', () => {
    const store = useReservationStore.getState()
    const beforeCount = store.reservations.length

    store.addReservation({
      name: 'InvalidDuration',
      partySize: 2,
      period: 'dinner',
      startTime: '19:00',
      endTime: '21:30',
      phone: '',
      note: '',
    })

    expect(useReservationStore.getState().reservations.length).toBe(beforeCount)
  })

  test('store rejects updateReservation when resulting duration is outside 1~2 hours', () => {
    const store = useReservationStore.getState()
    const A = addReservation({ name: 'A', partySize: 2, startTime: '19:00', endTime: '20:30' })

    store.updateReservation(A.id, { endTime: '21:30' })

    const after = useReservationStore.getState().reservations.find((r) => r.id === A.id)
    expect(after?.startTime).toBe('19:00')
    expect(after?.endTime).toBe('20:30')
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

  test('allows boundary-touching bookings on same table (end == next start)', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 2, startTime: '12:00', endTime: '13:00', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '13:00', endTime: '14:00', period: 'lunch' })

    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.setNextBookingMulti(['t1'], B.id, 'T1')

    const planned = useReservationStore.getState().sessionData.lunch.tableStates.t1?.plannedBookings ?? []
    expect(planned.map((p) => p.reservationId)).toEqual([A.id, B.id])
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

  test('A(T1-3) clear auto-seats B(T2-3) and C(T1), and blocks D(14:30) assignment on occupied overlap', () => {
    const store = useReservationStore.getState()

    const A = addReservation({ name: 'A', partySize: 6, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 3, startTime: '13:30', endTime: '15:00', period: 'lunch' })
    const C = addReservation({ name: 'C', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })
    const D = addReservation({ name: 'D', partySize: 2, startTime: '14:30', endTime: '16:00', period: 'lunch' })

    store.setActiveSession('lunch')
    store.setNextBookingMulti(['t1', 't2', 't3'], A.id, 'T1-3')
    store.seatWithSelectedMerge(A.id, 't1', ['t2', 't3'])

    // Assign future bookings while A is seated
    store.setNextBookingMulti(['t2', 't3'], B.id, 'T2-3')
    store.setNextBookingMulti(['t1'], C.id, 'T1')

    const beforeClear = useReservationStore.getState()
    const merged = beforeClear.getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(merged).toBeTruthy()

    beforeClear.clearTable(merged!.id)

    const afterClear = useReservationStore.getState()
    const tables = afterClear.getEffectiveTables()
    const seatedB = afterClear.reservations.find((r) => r.id === B.id)
    const seatedC = afterClear.reservations.find((r) => r.id === C.id)
    const waitingD = afterClear.reservations.find((r) => r.id === D.id)

    expect(seatedB?.status).toBe('seated')
    expect(seatedC?.status).toBe('seated')
    expect(waitingD?.status).toBe('waiting')

    const bTable = tables.find((t) => t.currentTeam?.reservationId === B.id)
    const cTable = tables.find((t) => t.currentTeam?.reservationId === C.id)
    expect(bTable?.label).toBe('T2-3')
    expect(cTable?.label).toBe('T1')

    // Overlapping assignment on currently occupied T1 (C until 15:00) should be rejected
    store.setNextBookingMulti(['t1'], D.id, 'T1')
    const finalLunchStates = useReservationStore.getState().sessionData.lunch.tableStates
    expect(finalLunchStates.t1?.plannedBookings?.some((p) => p.reservationId === D.id) ?? false).toBe(false)
  })

  test('removeReservation clears non-displayed entries from plannedBookings', () => {
    const store = useReservationStore.getState()
    const A = addReservation({ name: 'A', partySize: 2, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setActiveSession('lunch')
    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.setNextBookingMulti(['t1'], B.id, 'T1')

    let planned = useReservationStore.getState().sessionData.lunch.tableStates.t1?.plannedBookings ?? []
    expect(planned.map((p) => p.reservationId)).toEqual([A.id, B.id])

    store.removeReservation(B.id)

    planned = useReservationStore.getState().sessionData.lunch.tableStates.t1?.plannedBookings ?? []
    expect(planned.map((p) => p.reservationId)).toEqual([A.id])
  })

  test('updateReservation updates metadata for non-displayed planned booking entries', () => {
    const store = useReservationStore.getState()
    const A = addReservation({ name: 'A', partySize: 2, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setActiveSession('lunch')
    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.setNextBookingMulti(['t1'], B.id, 'T1')

    store.updateReservation(B.id, {
      name: 'B-updated',
      partySize: 4,
      startTime: '13:45',
      endTime: '15:30',
    })

    const planned = useReservationStore.getState().sessionData.lunch.tableStates.t1?.plannedBookings ?? []
    const updated = planned.find((p) => p.reservationId === B.id)
    expect(updated).toBeTruthy()
    expect(updated?.name).toBe('B-updated')
    expect(updated?.partySize).toBe(4)
    expect(updated?.startTime).toBe('13:45')
    expect(updated?.endTime).toBe('15:30')
  })

  test('manual merged seating preserves future planned bookings from each origin and excludes seated reservation', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })
    const C = addReservation({ name: 'C', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.setNextBookingMulti(['t1'], B.id, 'T1')
    store.setNextBookingMulti(['t2'], C.id, 'T2')
    store.seatWithSelectedMerge(A.id, 't1', ['t2'])

    const state = useReservationStore.getState()
    const merged = state.getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(merged).toBeTruthy()
    const mergedPlanned = state.sessionData.lunch.tableStates[merged!.id]?.plannedBookings ?? []
    const plannedIds = mergedPlanned.map((p) => p.reservationId)
    expect(plannedIds).not.toContain(A.id)
    expect(plannedIds).toContain(B.id)
    expect(plannedIds).toContain(C.id)
  })

  test('changing reservation period removes its planned merge assignment from old session', () => {
    const store = useReservationStore.getState()
    const A = addReservation({ name: 'A', partySize: 3, startTime: '12:00', endTime: '13:30', period: 'lunch' })

    store.setActiveSession('lunch')
    store.setNextBookingMulti(['t1', 't2'], A.id, 'T1-2')
    let lunchStates = useReservationStore.getState().sessionData.lunch.tableStates
    expect(lunchStates.t1?.plannedBookings?.some((p) => p.reservationId === A.id)).toBe(true)
    expect(lunchStates.t2?.plannedBookings?.some((p) => p.reservationId === A.id)).toBe(true)

    store.updateReservation(A.id, { period: 'dinner' })

    lunchStates = useReservationStore.getState().sessionData.lunch.tableStates
    expect(lunchStates.t1?.plannedBookings?.some((p) => p.reservationId === A.id) ?? false).toBe(false)
    expect(lunchStates.t2?.plannedBookings?.some((p) => p.reservationId === A.id) ?? false).toBe(false)
    expect(useReservationStore.getState().reservations.find((r) => r.id === A.id)?.period).toBe('dinner')
  })

  test('last-minute reservation update propagates to all scoped planned merge entries', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'Rush', partySize: 6, startTime: '12:00', endTime: '13:30', period: 'lunch' })

    store.setNextBookingMulti(['t1', 't2', 't3'], A.id, 'T1-3')
    store.updateReservation(A.id, {
      name: 'Rush-Updated',
      partySize: 5,
      startTime: '12:15',
      endTime: '13:45',
    })

    const states = useReservationStore.getState().sessionData.lunch.tableStates
    for (const id of ['t1', 't2', 't3']) {
      const booking = (states[id]?.plannedBookings ?? []).find((b) => b.reservationId === A.id)
      expect(booking?.name).toBe('Rush-Updated')
      expect(booking?.partySize).toBe(5)
      expect(booking?.startTime).toBe('12:15')
      expect(booking?.endTime).toBe('13:45')
    }
  })

  test('same-time same-scope conflict handling stays deterministic and keeps first assignment', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const B = addReservation({ name: 'B', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })
    const C = addReservation({ name: 'C', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setNextBookingMulti(['t1'], B.id, 'T1')
    store.setNextBookingMulti(['t1'], C.id, 'T1')

    const planned = useReservationStore.getState().sessionData.lunch.tableStates.t1?.plannedBookings ?? []
    expect(planned.map((p) => p.reservationId)).toEqual([B.id])
  })

  test('dinner assignment changes do not affect lunch seated merge state', () => {
    const store = useReservationStore.getState()
    const L = addReservation({ name: 'LunchMerged', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const D = addReservation({ name: 'DinnerPlan', partySize: 2, startTime: '19:00', endTime: '20:30', period: 'dinner' })

    store.setActiveSession('lunch')
    store.seatWithSelectedMerge(L.id, 't1', ['t2'])
    const lunchMerged = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.reservationId === L.id)
    expect(lunchMerged).toBeTruthy()

    store.setActiveSession('dinner')
    store.setNextBookingMulti(['t1'], D.id, 'T1')

    store.setActiveSession('lunch')
    const stillLunchMerged = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.reservationId === L.id)
    expect(stillLunchMerged).toBeTruthy()
    expect(stillLunchMerged?.mergedFrom?.map((o) => o.id).sort()).toEqual(['t1', 't2'])
  })

  test('seatReservation keeps other planned bookings on target table while removing seated reservation from queue', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 2, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.setNextBookingMulti(['t1'], B.id, 'T1')
    store.seatReservation(A.id, 't1')

    const planned = useReservationStore.getState().sessionData.lunch.tableStates.t1?.plannedBookings ?? []
    expect(planned.some((p) => p.reservationId === A.id)).toBe(false)
    expect(planned.some((p) => p.reservationId === B.id)).toBe(true)
  })

  test('setNextBookingMulti is atomic: failed reassignment keeps previous assignment intact', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 2, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '12:00', endTime: '13:30', period: 'lunch' })

    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.setNextBookingMulti(['t2'], B.id, 'T2')

    // Reassign B to conflicting T1 should fail, and B must stay on T2.
    store.setNextBookingMulti(['t1'], B.id, 'T1')

    const states = useReservationStore.getState().sessionData.lunch.tableStates
    expect(states.t1?.plannedBookings?.some((p) => p.reservationId === A.id)).toBe(true)
    expect(states.t1?.plannedBookings?.some((p) => p.reservationId === B.id) ?? false).toBe(false)
    expect(states.t2?.plannedBookings?.some((p) => p.reservationId === B.id)).toBe(true)
  })

  test('clearNextBooking removes only currently displayed booking from a multi-booking queue', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 2, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.setNextBookingMulti(['t1'], B.id, 'T1')
    store.clearNextBooking('t1')

    const planned = useReservationStore.getState().sessionData.lunch.tableStates.t1?.plannedBookings ?? []
    expect(planned.map((p) => p.reservationId)).toEqual([B.id])
  })

})
