import { beforeEach, describe, expect, test } from 'vitest'
import { useReservationStore } from './useReservationStore'
import { addReservation, resetStore } from './useReservationStore.integration.helpers'

describe('useReservationStore dense schedule integration', () => {
  beforeEach(() => {
    resetStore()
  })

  test('dense lunch service: merged/base next-wave assignments auto-seat correctly on clear', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    // Wave 1 (12:00~13:30)
    const A = addReservation({ name: 'A', partySize: 6, startTime: '12:00', endTime: '13:30', period: 'lunch' }) // T1-3
    const D = addReservation({ name: 'D', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' }) // T9-10

    // Wave 2 (13:30~15:00)
    const B = addReservation({ name: 'B', partySize: 3, startTime: '13:30', endTime: '15:00', period: 'lunch' }) // T1-2
    const C = addReservation({ name: 'C', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' }) // T3
    const E = addReservation({ name: 'E', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' }) // T9
    const F = addReservation({ name: 'F', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' }) // T10

    store.setNextBookingMulti(['t1', 't2', 't3'], A.id, 'T1-3')
    store.setNextBookingMulti(['t9', 't10'], D.id, 'T9-10')
    store.seatWithSelectedMerge(A.id, 't1', ['t2', 't3'])
    store.seatWithSelectedMerge(D.id, 't9', ['t10'])

    // Prepare wave 2 while wave 1 is seated.
    store.setNextBookingMulti(['t1', 't2'], B.id, 'T1-2')
    store.setNextBookingMulti(['t3'], C.id, 'T3')
    store.setNextBookingMulti(['t9'], E.id, 'T9')
    store.setNextBookingMulti(['t10'], F.id, 'T10')

    const seatedWave1 = useReservationStore.getState().getEffectiveTables()
    const mergedA = seatedWave1.find((t) => t.currentTeam?.reservationId === A.id)
    const mergedD = seatedWave1.find((t) => t.currentTeam?.reservationId === D.id)
    expect(mergedA).toBeTruthy()
    expect(mergedD).toBeTruthy()

    useReservationStore.getState().clearTable(mergedA!.id)
    useReservationStore.getState().clearTable(mergedD!.id)

    const final = useReservationStore.getState()
    expect(final.reservations.find((r) => r.id === B.id)?.status).toBe('seated')
    expect(final.reservations.find((r) => r.id === C.id)?.status).toBe('seated')
    expect(final.reservations.find((r) => r.id === E.id)?.status).toBe('seated')
    expect(final.reservations.find((r) => r.id === F.id)?.status).toBe('seated')

    const tables = final.getEffectiveTables()
    expect(tables.find((t) => t.currentTeam?.reservationId === B.id)?.label).toBe('T1-2')
    expect(tables.find((t) => t.currentTeam?.reservationId === C.id)?.label).toBe('T3')
    expect(tables.find((t) => t.currentTeam?.reservationId === E.id)?.label).toBe('T9')
    expect(tables.find((t) => t.currentTeam?.reservationId === F.id)?.label).toBe('T10')
  })

  test('dense single-table queue maintains order while clearNextBooking pops head only', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 2, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })
    const C = addReservation({ name: 'C', partySize: 2, startTime: '15:00', endTime: '16:30', period: 'lunch' })
    const D = addReservation({ name: 'D', partySize: 2, startTime: '16:30', endTime: '18:00', period: 'lunch' })

    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.setNextBookingMulti(['t1'], B.id, 'T1')
    store.setNextBookingMulti(['t1'], C.id, 'T1')
    store.setNextBookingMulti(['t1'], D.id, 'T1')

    const pickIds = () => (useReservationStore.getState().sessionData.lunch.tableStates.t1?.plannedBookings ?? []).map((p) => p.reservationId)
    expect(pickIds()).toEqual([A.id, B.id, C.id, D.id])

    store.clearNextBooking('t1')
    expect(pickIds()).toEqual([B.id, C.id, D.id])
    store.clearNextBooking('t1')
    expect(pickIds()).toEqual([C.id, D.id])
    store.clearNextBooking('t1')
    expect(pickIds()).toEqual([D.id])
  })

  test('dense conflict matrix: overlapping scopes are blocked, touching boundaries are accepted', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    const A = addReservation({ name: 'A', partySize: 3, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '12:15', endTime: '13:45', period: 'lunch' }) // overlap
    const C = addReservation({ name: 'C', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' }) // touching
    const D = addReservation({ name: 'D', partySize: 2, startTime: '12:15', endTime: '13:45', period: 'lunch' }) // overlap but disjoint scope

    store.setNextBookingMulti(['t1', 't2'], A.id, 'T1-2')
    store.setNextBookingMulti(['t2'], B.id, 'T2') // should be blocked
    store.setNextBookingMulti(['t1'], C.id, 'T1') // should be accepted
    store.setNextBookingMulti(['t3'], D.id, 'T3') // should be accepted (disjoint table)

    const states = useReservationStore.getState().sessionData.lunch.tableStates
    const t1 = states.t1?.plannedBookings ?? []
    const t2 = states.t2?.plannedBookings ?? []
    const t3 = states.t3?.plannedBookings ?? []

    expect(t1.some((p) => p.reservationId === A.id)).toBe(true)
    expect(t2.some((p) => p.reservationId === A.id)).toBe(true)
    expect(t2.some((p) => p.reservationId === B.id)).toBe(false)
    expect(t1.some((p) => p.reservationId === C.id)).toBe(true)
    expect(t3.some((p) => p.reservationId === D.id)).toBe(true)
  })

  test('dense clear cycle does not duplicate or lose reservations across repeated auto-seat transitions', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    const A = addReservation({ name: 'A', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 4, startTime: '13:30', endTime: '15:00', period: 'lunch' })
    const C = addReservation({ name: 'C', partySize: 4, startTime: '15:00', endTime: '16:30', period: 'lunch' })

    store.setNextBookingMulti(['t1', 't2'], A.id, 'T1-2')
    store.setNextBookingMulti(['t1', 't2'], B.id, 'T1-2')
    store.setNextBookingMulti(['t1', 't2'], C.id, 'T1-2')

    store.seatWithSelectedMerge(A.id, 't1', ['t2'])
    let current = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(current).toBeTruthy()

    // clear #1 -> B should be seated
    useReservationStore.getState().clearTable(current!.id)
    expect(useReservationStore.getState().reservations.find((r) => r.id === B.id)?.status).toBe('seated')
    current = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.reservationId === B.id)
    expect(current).toBeTruthy()

    // clear #2 -> C should be seated
    useReservationStore.getState().clearTable(current!.id)
    expect(useReservationStore.getState().reservations.find((r) => r.id === C.id)?.status).toBe('seated')
    current = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.reservationId === C.id)
    expect(current).toBeTruthy()

    // uniqueness/integrity check
    const seatedIds = useReservationStore.getState().reservations.filter((r) => r.status === 'seated').map((r) => r.id)
    expect(seatedIds.filter((id) => id === C.id).length).toBe(1)
    expect(useReservationStore.getState().sessionData.lunch.merges.length).toBeGreaterThanOrEqual(1)
  })
})

