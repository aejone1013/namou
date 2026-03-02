import { beforeEach, describe, expect, test } from 'vitest'
import { timeToMinutes } from '@/data/dummy'
import { addReservation, resetStore } from './useReservationStore.integration.helpers'
import { useReservationStore } from './useReservationStore'

function createRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (1664525 * s + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function pickOne<T>(arr: T[], rng: () => number): T | null {
  if (arr.length === 0) return null
  return arr[Math.floor(rng() * arr.length)]
}

function assertCoreInvariants() {
  const state = useReservationStore.getState()
  const session = state.sessionData[state.activeSession]
  const effective = state.getEffectiveTables()

  const seatedByReservation = new Map<string, string>()
  for (const t of effective) {
    if (t.currentTeam?.reservationId) {
      const rid = t.currentTeam.reservationId
      if (seatedByReservation.has(rid)) {
        throw new Error(`duplicate-seated-reservation rid=${rid} tableA=${seatedByReservation.get(rid)} tableB=${t.id}`)
      }
      seatedByReservation.set(rid, t.id)
    }
  }

  for (const r of state.reservations) {
    const seatedTableId = seatedByReservation.get(r.id)
    if (r.status === 'seated') {
      if (!seatedTableId) {
        throw new Error(`seated-reservation-missing-table rid=${r.id} tableId=${r.tableId ?? 'null'}`)
      }
      if (r.tableId !== seatedTableId) {
        throw new Error(`seated-table-mismatch rid=${r.id} reservation.tableId=${r.tableId ?? 'null'} actual=${seatedTableId}`)
      }
    } else {
      if (seatedTableId) {
        throw new Error(`non-seated-reservation-has-table rid=${r.id} status=${r.status} actual=${seatedTableId}`)
      }
    }
  }

  for (const [tableId, ts] of Object.entries(session.tableStates)) {
    const planned = ts.plannedBookings ?? (ts.nextBooking ? [ts.nextBooking] : [])
    if (planned.length === 0) {
      if ((ts.nextBooking ?? null) !== null) {
        throw new Error(`empty-planned-has-nextBooking table=${tableId}`)
      }
      continue
    }

    const sorted = [...planned].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    const actualOrder = planned.map((p) => p.reservationId).join(',')
    const sortedOrder = sorted.map((p) => p.reservationId).join(',')
    if (actualOrder !== sortedOrder) {
      throw new Error(`planned-order-invalid table=${tableId} actual=${actualOrder} expected=${sortedOrder}`)
    }
    if (ts.nextBooking?.reservationId !== planned[0].reservationId) {
      throw new Error(`nextBooking-head-mismatch table=${tableId} next=${ts.nextBooking?.reservationId ?? 'null'} head=${planned[0].reservationId}`)
    }

    // Same-table queue should not contain time-overlapping different reservations.
    for (let i = 0; i < planned.length; i++) {
      for (let j = i + 1; j < planned.length; j++) {
        const a = planned[i]
        const b = planned[j]
        const overlap = timeToMinutes(a.startTime) < timeToMinutes(b.endTime) && timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
        const aUsesTable = !a.scopeTableIds || a.scopeTableIds.length === 0 || a.scopeTableIds.includes(tableId)
        const bUsesTable = !b.scopeTableIds || b.scopeTableIds.length === 0 || b.scopeTableIds.includes(tableId)
        if (a.reservationId !== b.reservationId) {
          if (aUsesTable && bUsesTable) {
            if (overlap) {
              throw new Error(
                `overlap-on-table table=${tableId} a=${a.reservationId}(${a.startTime}-${a.endTime}) scopeA=${JSON.stringify(a.scopeTableIds ?? [])} ` +
                `b=${b.reservationId}(${b.startTime}-${b.endTime}) scopeB=${JSON.stringify(b.scopeTableIds ?? [])}`
              )
            }
          }
        }
      }
    }
  }
}

describe('useReservationStore property/stress integration', () => {
  beforeEach(() => {
    resetStore()
  })

  function runRandomScenario(seed: number, reservationCount = 60, steps = 220) {
    resetStore()
    const rng = createRng(seed)
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    const starts = ['12:00', '13:30', '15:00', '16:30']
    const ends = ['13:30', '15:00', '16:30', '18:00']

    for (let i = 0; i < reservationCount; i++) {
      const k = Math.floor(rng() * starts.length)
      addReservation({
        name: `R${i + 1}`,
        partySize: 1 + Math.floor(rng() * 6),
        startTime: starts[k],
        endTime: ends[k],
        period: 'lunch',
      })
    }

    const baseIds = useReservationStore.getState().tables.map((t) => t.id)
    for (let step = 0; step < steps; step++) {
      const current = useReservationStore.getState()
      const effective = current.getEffectiveTables()
      const available = effective.filter((t) => t.status === 'available')
      const occupied = effective.filter((t) => t.status === 'occupied')
      const waiting = current.reservations.filter((r) => r.status === 'waiting' && r.period === 'lunch')

      const action = Math.floor(rng() * 6)
      if (action === 0 && waiting.length > 0 && available.length > 0) {
        const r = pickOne(waiting, rng)!
        const t = pickOne(available, rng)!
        if (r.partySize <= t.seats) current.seatReservation(r.id, t.id)
        else current.seatWithAutoMerge(r.id, t.id)
      } else if (action === 1 && waiting.length > 0 && available.length > 0) {
        const r = pickOne(waiting, rng)!
        const base = pickOne(available.filter((t) => baseIds.includes(t.id)), rng)
        if (base) {
          current.setNextBookingMulti([base.id], r.id, base.label)
        }
      } else if (action === 2 && occupied.length > 0) {
        const t = pickOne(occupied, rng)!
        current.clearTable(t.id)
      } else if (action === 3 && available.length > 0) {
        const t = pickOne(available, rng)!
        const size = 2 + Math.floor(rng() * 7)
        current.walkInTable(t.id, size, `W-${step}`)
      } else if (action === 4 && occupied.length > 0 && available.length > 0) {
        const from = pickOne(occupied, rng)!
        const to = pickOne(available, rng)!
        current.moveToTable(from.id, to.id)
      } else if (action === 5 && waiting.length > 0 && available.length > 1) {
        const r = pickOne(waiting, rng)!
        const base = pickOne(available.filter((t) => baseIds.includes(t.id)), rng)
        if (base) {
          const candidates = available.filter((t) => t.id !== base.id && baseIds.includes(t.id))
          const one = pickOne(candidates, rng)
          if (one) {
            current.walkInWithSelectedMerge(base.id, Math.max(3, 1 + Math.floor(rng() * 8)), `WM-${step}`, [one.id])
          }
          current.setNextBookingMulti([base.id], r.id, base.label)
        }
      }

      try {
        assertCoreInvariants()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(`seed=${seed}, step=${step}: ${msg}`)
      }
    }
  }

  test('randomized operations preserve core invariants across multiple seeds', () => {
    const seeds = [20260301, 20260302, 20260303, 20260304, 20260305, 20260306, 20260307, 20260308]
    for (const seed of seeds) {
      runRandomScenario(seed, 56, 180)
    }
  })

  test('high-volume scheduling smoke stays responsive and consistent', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const starts = ['12:00', '13:30', '15:00', '16:30']
    const ends = ['13:30', '15:00', '16:30', '18:00']

    const t0 = Date.now()
    for (let i = 0; i < 220; i++) {
      const k = i % starts.length
      addReservation({
        name: `HV-${i + 1}`,
        partySize: (i % 6) + 1,
        startTime: starts[k],
        endTime: ends[k],
        period: 'lunch',
      })
    }

    const state = useReservationStore.getState()
    const waiting = state.reservations.filter((r) => r.period === 'lunch')
    const baseIds = state.tables.map((t) => t.id)
    for (let i = 0; i < waiting.length; i++) {
      const r = waiting[i]
      const baseId = baseIds[i % baseIds.length]
      state.setNextBookingMulti([baseId], r.id, `T${baseId.replace('t', '')}`)
      if (i % 5 === 0) {
        const table = useReservationStore.getState().getEffectiveTables().find((t) => t.id === baseId)
        if (table && table.status === 'available') {
          if (r.partySize <= table.seats) state.seatReservation(r.id, baseId)
          else state.seatWithAutoMerge(r.id, baseId)
        }
      }
    }

    for (let i = 0; i < 80; i++) {
      const eff = useReservationStore.getState().getEffectiveTables()
      const occupied = eff.find((t) => t.status === 'occupied')
      if (!occupied) break
      useReservationStore.getState().clearTable(occupied.id)
    }
    const elapsed = Date.now() - t0

    assertCoreInvariants()
    expect(elapsed).toBeLessThan(12000)
  })
})
