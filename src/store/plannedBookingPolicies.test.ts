import test from 'node:test'
import assert from 'node:assert/strict'
import {
  bookingConflictsOnSameTable,
  bookingScopesOverlap,
  mergeFuturePlannedBookingsForMergedSeat,
  reservationOverlapsBooking,
  selectSimultaneousScopedAutoSeatBookings,
  timeRangesOverlap,
} from './plannedBookingPolicies.ts'

test('timeRangesOverlap returns true for overlapping ranges', () => {
  assert.equal(
    timeRangesOverlap({ startTime: '19:00', endTime: '20:30' }, { startTime: '20:00', endTime: '21:30' }),
    true
  )
})

test('timeRangesOverlap returns false for touching ranges', () => {
  assert.equal(
    timeRangesOverlap({ startTime: '19:00', endTime: '20:30' }, { startTime: '20:30', endTime: '22:00' }),
    false
  )
})

test('bookingScopesOverlap detects shared table ids', () => {
  assert.equal(bookingScopesOverlap(['t1', 't2'], ['t2', 't3']), true)
  assert.equal(bookingScopesOverlap(['t1'], ['t3']), false)
})

test('bookingConflictsOnSameTable ignores same reservation id', () => {
  assert.equal(
    bookingConflictsOnSameTable(
      {
        reservationId: 'A',
        name: 'A',
        partySize: 2,
        startTime: '19:00',
        endTime: '20:30',
      },
      { startTime: '19:30', endTime: '21:00' },
      'A'
    ),
    false
  )
})

test('bookingConflictsOnSameTable blocks overlapping different reservation on same table', () => {
  assert.equal(
    bookingConflictsOnSameTable(
      {
        reservationId: 'A',
        name: 'A',
        partySize: 2,
        startTime: '19:00',
        endTime: '20:30',
      },
      { startTime: '20:00', endTime: '21:30' },
      'B'
    ),
    true
  )
})

test('reservationOverlapsBooking treats equal boundary as non-overlap', () => {
  assert.equal(
    reservationOverlapsBooking(
      { startTime: '20:30', endTime: '22:00' },
      { startTime: '19:00', endTime: '20:30' }
    ),
    false
  )
})

test('mergeFuturePlannedBookingsForMergedSeat preserves future split reservations (A/B/C scenario)', () => {
  const merged = mergeFuturePlannedBookingsForMergedSeat(
    {
      t1: [{
        reservationId: 'A',
        name: 'A',
        partySize: 6,
        startTime: '19:00',
        endTime: '20:30',
        targetLabel: 'T1-3',
        scopeTableIds: ['t1', 't2', 't3'],
      }, {
        reservationId: 'B',
        name: 'B',
        partySize: 3,
        startTime: '20:30',
        endTime: '22:00',
        targetLabel: 'T1-2',
        scopeTableIds: ['t1', 't2'],
      }],
      t2: [{
        reservationId: 'A',
        name: 'A',
        partySize: 6,
        startTime: '19:00',
        endTime: '20:30',
        targetLabel: 'T1-3',
        scopeTableIds: ['t1', 't2', 't3'],
      }, {
        reservationId: 'B',
        name: 'B',
        partySize: 3,
        startTime: '20:30',
        endTime: '22:00',
        targetLabel: 'T1-2',
        scopeTableIds: ['t1', 't2'],
      }],
      t3: [{
        reservationId: 'A',
        name: 'A',
        partySize: 6,
        startTime: '19:00',
        endTime: '20:30',
        targetLabel: 'T1-3',
        scopeTableIds: ['t1', 't2', 't3'],
      }, {
        reservationId: 'C',
        name: 'C',
        partySize: 2,
        startTime: '20:30',
        endTime: '22:00',
        targetLabel: 'T3',
        scopeTableIds: ['t3'],
      }],
    },
    ['t1', 't2', 't3'],
    'A'
  )

  assert.deepEqual(merged.map((b) => b.reservationId), ['B', 'C'])
  assert.equal(merged.find((b) => b.reservationId === 'B')?.targetLabel, 'T1-2')
  assert.equal(merged.find((b) => b.reservationId === 'C')?.targetLabel, 'T3')
})

test('mergeFuturePlannedBookingsForMergedSeat dedupes duplicate future booking across multiple tables', () => {
  const merged = mergeFuturePlannedBookingsForMergedSeat(
    {
      t1: [{
        reservationId: 'B',
        name: 'B',
        partySize: 3,
        startTime: '20:30',
        endTime: '22:00',
        targetLabel: 'T1-2',
        scopeTableIds: ['t1', 't2'],
      }],
      t2: [{
        reservationId: 'B',
        name: 'B',
        partySize: 3,
        startTime: '20:30',
        endTime: '22:00',
        targetLabel: 'T1-2',
        scopeTableIds: ['t1', 't2'],
      }],
    },
    ['t1', 't2']
  )

  assert.equal(merged.length, 1)
  assert.equal(merged[0].reservationId, 'B')
  assert.deepEqual(merged[0].scopeTableIds, ['t1', 't2'])
})

test('mergeFuturePlannedBookingsForMergedSeat sorts by start time', () => {
  const merged = mergeFuturePlannedBookingsForMergedSeat(
    {
      t1: [
        {
          reservationId: 'LATE',
          name: 'late',
          partySize: 2,
          startTime: '21:00',
          endTime: '22:30',
        },
        {
          reservationId: 'EARLY',
          name: 'early',
          partySize: 2,
          startTime: '20:30',
          endTime: '22:00',
        },
      ],
    },
    ['t1']
  )

  assert.deepEqual(merged.map((b) => b.reservationId), ['EARLY', 'LATE'])
})

test('mergeFuturePlannedBookingsForMergedSeat excludes only seated reservation and keeps later same-table booking', () => {
  const merged = mergeFuturePlannedBookingsForMergedSeat(
    {
      t1: [
        {
          reservationId: 'A',
          name: 'A',
          partySize: 2,
          startTime: '19:00',
          endTime: '20:30',
        },
        {
          reservationId: 'B',
          name: 'B',
          partySize: 2,
          startTime: '20:30',
          endTime: '22:00',
          scopeTableIds: ['t1'],
        },
      ],
    },
    ['t1'],
    'A'
  )

  assert.deepEqual(merged.map((b) => b.reservationId), ['B'])
  assert.deepEqual(merged[0].scopeTableIds, ['t1'])
})

test('mergeFuturePlannedBookingsForMergedSeat unions scope ids when same booking appears with partial scopes', () => {
  const merged = mergeFuturePlannedBookingsForMergedSeat(
    {
      t1: [{
        reservationId: 'B',
        name: 'B',
        partySize: 4,
        startTime: '20:30',
        endTime: '22:00',
        targetLabel: 'T1-3',
        scopeTableIds: ['t1', 't2'],
      }],
      t3: [{
        reservationId: 'B',
        name: 'B',
        partySize: 4,
        startTime: '20:30',
        endTime: '22:00',
        targetLabel: 'T1-3',
        scopeTableIds: ['t3'],
      }],
    },
    ['t1', 't3']
  )

  assert.equal(merged.length, 1)
  assert.deepEqual(merged[0].scopeTableIds, ['t1', 't2', 't3'])
})

test('selectSimultaneousScopedAutoSeatBookings picks disjoint same-start scoped bookings (B/C on split T1-3)', () => {
  const selected = selectSimultaneousScopedAutoSeatBookings(
    [
      {
        reservationId: 'B',
        name: 'B',
        partySize: 3,
        startTime: '20:30',
        endTime: '22:00',
        targetLabel: 'T1-2',
        scopeTableIds: ['t1', 't2'],
      },
      {
        reservationId: 'C',
        name: 'C',
        partySize: 2,
        startTime: '20:30',
        endTime: '22:00',
        targetLabel: 'T3',
        scopeTableIds: ['t3'],
      },
      {
        reservationId: 'D',
        name: 'D',
        partySize: 2,
        startTime: '21:00',
        endTime: '22:30',
        targetLabel: 'T1',
        scopeTableIds: ['t1'],
      },
    ],
    ['t1', 't2', 't3']
  )

  assert.deepEqual(selected.map((b) => b.reservationId).sort(), ['B', 'C'])
})

test('selectSimultaneousScopedAutoSeatBookings skips overlapping same-start scopes', () => {
  const selected = selectSimultaneousScopedAutoSeatBookings(
    [
      {
        reservationId: 'B',
        name: 'B',
        partySize: 4,
        startTime: '20:30',
        endTime: '22:00',
        targetLabel: 'T1-3',
        scopeTableIds: ['t1', 't2', 't3'],
      },
      {
        reservationId: 'C',
        name: 'C',
        partySize: 2,
        startTime: '20:30',
        endTime: '22:00',
        targetLabel: 'T3',
        scopeTableIds: ['t3'],
      },
    ],
    ['t1', 't2', 't3']
  )

  assert.deepEqual(selected.map((b) => b.reservationId), ['B'])
})
