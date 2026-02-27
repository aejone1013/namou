import test from 'node:test'
import assert from 'node:assert/strict'
import { decideNextBookingOnBaseTableClear } from './clearTablePolicies.ts'

test('keeps next booking when party exceeds base table seats', () => {
  assert.equal(decideNextBookingOnBaseTableClear(2, 3), 'keep-next-booking')
})

test('auto-seats when party fits base table seats', () => {
  assert.equal(decideNextBookingOnBaseTableClear(4, 4), 'auto-seat')
  assert.equal(decideNextBookingOnBaseTableClear(4, 2), 'auto-seat')
})
