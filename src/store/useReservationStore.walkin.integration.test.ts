import { beforeEach, describe, expect, test } from 'vitest'
import { useReservationStore } from './useReservationStore'
import { addReservation, resetStore } from './useReservationStore.integration.helpers'

describe('useReservationStore integration (walkin)', () => {
  beforeEach(() => {
    resetStore()
  })

  test('walkInTable auto-merges available neighbors when party exceeds base seats', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    store.walkInTable('t1', 4, 'WalkIn-4')

    const tables = useReservationStore.getState().getEffectiveTables()
    const merged = tables.find((t) => t.currentTeam?.name === 'WalkIn-4')
    expect(merged).toBeTruthy()
    expect(merged?.status).toBe('occupied')
    expect(merged?.mergedFrom?.length).toBeGreaterThanOrEqual(2)
    expect((merged?.currentTeam?.partySize ?? 0) >= 4).toBe(true)
  })

  test('walkInWithSelectedMerge seats walk-in using manually selected merge tables', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    store.walkInWithSelectedMerge('t1', 4, 'ManualWalkIn', ['t2'])

    const tables = useReservationStore.getState().getEffectiveTables()
    const merged = tables.find((t) => t.currentTeam?.name === 'ManualWalkIn')
    expect(merged).toBeTruthy()
    expect(merged?.status).toBe('occupied')
    expect(merged?.mergedFrom?.map((o) => o.id).sort()).toEqual(['t1', 't2'])
  })

  test('walkInTable seats directly when party fits and keeps planned bookings', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.walkInTable('t1', 2, 'WalkIn-2')

    const state = useReservationStore.getState()
    const t1 = state.sessionData.lunch.tableStates.t1
    expect(t1?.status).toBe('occupied')
    expect(t1?.currentTeam?.name).toBe('WalkIn-2')
    expect(t1?.plannedBookings?.some((b) => b.reservationId === A.id)).toBe(true)
  })

  test('walkInTable uses default name when name is empty', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    store.walkInTable('t1', 2)

    const tables = useReservationStore.getState().getEffectiveTables()
    const occupied = tables.find((t) => t.id === 't1')
    expect(occupied?.currentTeam?.name).toBe('워크인')
  })

  test('walkInTable rejects party size below 2', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    store.walkInTable('t1', 1, 'TooSmall')

    const table = useReservationStore.getState().getEffectiveTables().find((t) => t.id === 't1')
    expect(table?.status).toBe('available')
  })

  test('walkInWithSelectedMerge does nothing when selected seats are insufficient', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    store.walkInWithSelectedMerge('t1', 6, 'TooBig', ['t2'])

    const tables = useReservationStore.getState().getEffectiveTables()
    const seated = tables.find((t) => t.currentTeam?.name === 'TooBig')
    expect(seated).toBeFalsy()
    expect(tables.find((t) => t.id === 't1')?.status).toBe('available')
    expect(tables.find((t) => t.id === 't2')?.status).toBe('available')
  })

  test('walkInWithSelectedMerge does nothing when one selected table is unavailable', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    store.walkInTable('t2', 2, 'BlockT2')
    store.walkInWithSelectedMerge('t1', 4, 'ShouldFail', ['t2'])

    const tables = useReservationStore.getState().getEffectiveTables()
    const seated = tables.find((t) => t.currentTeam?.name === 'ShouldFail')
    expect(seated).toBeFalsy()
    expect(tables.find((t) => t.currentTeam?.name === 'BlockT2')).toBeTruthy()
  })

  test('walkInWithSelectedMerge preserves future planned bookings from merged origins', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })
    const B = addReservation({ name: 'B', partySize: 2, startTime: '15:00', endTime: '16:30', period: 'lunch' })

    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.setNextBookingMulti(['t2'], B.id, 'T2')
    store.walkInWithSelectedMerge('t1', 4, 'MergeWalkIn', ['t2'])

    const tables = useReservationStore.getState().getEffectiveTables()
    const merged = tables.find((t) => t.currentTeam?.name === 'MergeWalkIn')
    expect(merged).toBeTruthy()
    const mergedState = useReservationStore.getState().sessionData.lunch.tableStates[merged!.id]
    const plannedIds = (mergedState?.plannedBookings ?? []).map((p) => p.reservationId)
    expect(plannedIds).toContain(A.id)
    expect(plannedIds).toContain(B.id)
  })

  test('walkInTable keeps merge strictly within same column', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    // Block all same-group neighbors for T7.
    for (const id of ['t1', 't2', 't3', 't4', 't5', 't6']) {
      store.walkInTable(id, 2, `Block-${id}`)
    }

    store.walkInTable('t7', 4, 'SameColumnOnly')

    const tables = useReservationStore.getState().getEffectiveTables()
    const merged = tables.find((t) => t.currentTeam?.name === 'SameColumnOnly')
    expect(merged).toBeFalsy()
    const t7 = tables.find((t) => t.id === 't7')
    expect(t7?.status).toBe('available')
  })

  test('walkInTable does nothing on already occupied table', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    store.walkInTable('t1', 2, 'First')
    store.walkInTable('t1', 2, 'Second')

    const table = useReservationStore.getState().getEffectiveTables().find((t) => t.id === 't1')
    expect(table?.currentTeam?.name).toBe('First')
  })

  test('lunch walk-in occupancy does not leak into dinner session', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    store.walkInTable('t1', 2, 'LunchOnly')

    let lunchTable = useReservationStore.getState().getEffectiveTables().find((t) => t.id === 't1')
    expect(lunchTable?.status).toBe('occupied')
    expect(lunchTable?.currentTeam?.name).toBe('LunchOnly')

    store.setActiveSession('dinner')
    const dinnerTable = useReservationStore.getState().getEffectiveTables().find((t) => t.id === 't1')
    expect(dinnerTable?.status).toBe('available')
    expect(dinnerTable?.currentTeam).toBeNull()
  })

  test('clearing merged walk-in restores origin tables as available', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    store.walkInWithSelectedMerge('t1', 4, 'MergedWalkIn', ['t2'])

    const beforeClear = useReservationStore.getState()
    const merged = beforeClear.getEffectiveTables().find((t) => t.currentTeam?.name === 'MergedWalkIn')
    expect(merged).toBeTruthy()

    beforeClear.clearTable(merged!.id)

    const after = useReservationStore.getState()
    const t1 = after.getEffectiveTables().find((t) => t.id === 't1')
    const t2 = after.getEffectiveTables().find((t) => t.id === 't2')
    expect(t1?.status).toBe('available')
    expect(t2?.status).toBe('available')
    expect(after.getEffectiveTables().some((t) => t.id === merged!.id)).toBe(false)
  })

  test('clearing merged walk-in auto-seats earliest planned booking if it fits base table', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.walkInWithSelectedMerge('t1', 4, 'MergedWalkIn', ['t2'])
    const merged = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.name === 'MergedWalkIn')
    expect(merged).toBeTruthy()

    useReservationStore.getState().clearTable(merged!.id)

    const after = useReservationStore.getState()
    const resA = after.reservations.find((r) => r.id === A.id)
    const seatedTable = after.getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(resA?.status).toBe('seated')
    expect(seatedTable?.id).toBe('t1')
  })

  test('walkInWithSelectedMerge rejects non-base selected table id (safety guard)', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'A', partySize: 4, startTime: '12:00', endTime: '13:30', period: 'lunch' })

    // Create an occupied merged table id first.
    store.seatWithSelectedMerge(A.id, 't1', ['t2'])
    const merged = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)
    expect(merged).toBeTruthy()

    // Attempt to use merged id as merge target for walk-in should be ignored.
    store.walkInWithSelectedMerge('t3', 4, 'Unsafe', [merged!.id])

    const unsafe = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.name === 'Unsafe')
    expect(unsafe).toBeFalsy()
  })

  test('undo restores table after direct walk-in seating snapshot', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    store.saveUndoSnapshot('before-direct-walkin')
    store.walkInTable('t1', 2, 'DirectWalkIn')
    expect(useReservationStore.getState().getEffectiveTables().find((t) => t.id === 't1')?.status).toBe('occupied')

    store.undo()
    const table = useReservationStore.getState().getEffectiveTables().find((t) => t.id === 't1')
    expect(table?.status).toBe('available')
    expect(table?.currentTeam).toBeNull()
  })

  test('undo restores split tables after manual merged walk-in snapshot', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    store.saveUndoSnapshot('before-manual-merge-walkin')
    store.walkInWithSelectedMerge('t1', 4, 'MergedWalkInUndo', ['t2'])
    const seated = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.name === 'MergedWalkInUndo')
    expect(seated).toBeTruthy()
    expect(seated?.mergedFrom?.map((o) => o.id).sort()).toEqual(['t1', 't2'])

    store.undo()
    const after = useReservationStore.getState()
    const t1 = after.getEffectiveTables().find((t) => t.id === 't1')
    const t2 = after.getEffectiveTables().find((t) => t.id === 't2')
    expect(t1?.status).toBe('available')
    expect(t2?.status).toBe('available')
    expect(after.sessionData.lunch.merges.length).toBe(0)
  })

  test('undo after clear restores merged walk-in occupancy and merge state', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    store.walkInWithSelectedMerge('t1', 4, 'MergedWalkInRestore', ['t2'])
    const mergedBeforeClear = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.name === 'MergedWalkInRestore')
    expect(mergedBeforeClear).toBeTruthy()

    store.saveUndoSnapshot('before-clear-merged-walkin')
    store.clearTable(mergedBeforeClear!.id)
    const afterClear = useReservationStore.getState().getEffectiveTables()
    expect(afterClear.some((t) => t.currentTeam?.name === 'MergedWalkInRestore')).toBe(false)

    store.undo()
    const restored = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.name === 'MergedWalkInRestore')
    expect(restored).toBeTruthy()
    expect(restored?.status).toBe('occupied')
    expect(restored?.mergedFrom?.map((o) => o.id).sort()).toEqual(['t1', 't2'])
  })

  test('walk-in undo follows LIFO across direct seat, manual merge seat, and clear', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    // Step 1: direct walk-in on t1
    store.saveUndoSnapshot('before-direct')
    store.walkInTable('t1', 2, 'W1')
    expect(useReservationStore.getState().getEffectiveTables().find((t) => t.id === 't1')?.currentTeam?.name).toBe('W1')

    // Step 2: clear t1 to free it, then manual merged walk-in on t1+t2
    store.clearTable('t1')
    store.saveUndoSnapshot('before-merge')
    store.walkInWithSelectedMerge('t1', 4, 'W2', ['t2'])
    const merged = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.name === 'W2')
    expect(merged).toBeTruthy()

    // Step 3: clear merged table
    store.saveUndoSnapshot('before-clear-merged')
    store.clearTable(merged!.id)
    expect(useReservationStore.getState().getEffectiveTables().some((t) => t.currentTeam?.name === 'W2')).toBe(false)

    // Undo #1 -> merged W2 restored
    store.undo()
    const afterUndo1 = useReservationStore.getState()
    const restoredMerged = afterUndo1.getEffectiveTables().find((t) => t.currentTeam?.name === 'W2')
    expect(restoredMerged).toBeTruthy()
    expect(restoredMerged?.mergedFrom?.map((o) => o.id).sort()).toEqual(['t1', 't2'])

    // Undo #2 -> before merge: t1/t2 available, no W2
    store.undo()
    const afterUndo2 = useReservationStore.getState()
    const t1AfterUndo2 = afterUndo2.getEffectiveTables().find((t) => t.id === 't1')
    const t2AfterUndo2 = afterUndo2.getEffectiveTables().find((t) => t.id === 't2')
    expect(afterUndo2.getEffectiveTables().some((t) => t.currentTeam?.name === 'W2')).toBe(false)
    expect(t1AfterUndo2?.status).toBe('available')
    expect(t2AfterUndo2?.status).toBe('available')

    // Undo #3 -> before direct: no W1 seat
    store.undo()
    const afterUndo3 = useReservationStore.getState()
    expect(afterUndo3.getEffectiveTables().find((t) => t.id === 't1')?.currentTeam).toBeNull()
    expect(afterUndo3.getEffectiveTables().find((t) => t.id === 't1')?.status).toBe('available')
  })

  test('walk-in can occupy table with future booking and clearing later auto-seats that booking', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')
    const A = addReservation({ name: 'Future', partySize: 2, startTime: '13:30', endTime: '15:00', period: 'lunch' })

    store.setNextBookingMulti(['t1'], A.id, 'T1')
    store.walkInTable('t1', 2, 'NowWalkIn')
    expect(useReservationStore.getState().getEffectiveTables().find((t) => t.id === 't1')?.currentTeam?.name).toBe('NowWalkIn')

    store.clearTable('t1')
    const after = useReservationStore.getState()
    expect(after.reservations.find((r) => r.id === A.id)?.status).toBe('seated')
    expect(after.getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id)?.id).toBe('t1')
  })

  test('extreme walk-in party size 14 seats by merged occupancy when enough tables are available', () => {
    const store = useReservationStore.getState()
    store.setActiveSession('lunch')

    store.walkInTable('t1', 14, 'MaxWalkIn14')
    const tables = useReservationStore.getState().getEffectiveTables()
    const merged = tables.find((t) => t.currentTeam?.name === 'MaxWalkIn14')
    expect(merged).toBeTruthy()
    const totalSeats = merged?.mergedFrom
      ? merged.mergedFrom.reduce((sum, o) => sum + o.seats, 0)
      : (merged?.seats ?? 0)
    expect(totalSeats).toBeGreaterThanOrEqual(14)
    expect(merged?.status).toBe('occupied')
  })

})
