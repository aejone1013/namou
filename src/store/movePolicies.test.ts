import test from 'node:test'
import assert from 'node:assert/strict'
import { canMovePartyToTable } from './movePolicies.ts'

test('allows move when party fits target seats', () => {
  assert.equal(canMovePartyToTable(2, 2), true)
  assert.equal(canMovePartyToTable(3, 4), true)
})

test('rejects move when party exceeds target seats', () => {
  assert.equal(canMovePartyToTable(5, 4), false)
})

