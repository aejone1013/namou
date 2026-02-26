import test from 'node:test'
import assert from 'node:assert/strict'
import { planAdjacentMerge } from './mergePlanner.ts'

test('returns null when seats are insufficient', () => {
  const result = planAdjacentMerge(2, 2, 8, [
    { id: 't1', num: 1, seats: 2 },
    { id: 't3', num: 3, seats: 2 },
  ])
  assert.equal(result, null)
})

test('prefers hi then lo while keeping contiguous range', () => {
  const result = planAdjacentMerge(2, 2, 6, [
    { id: 't1', num: 1, seats: 2 },
    { id: 't3', num: 3, seats: 2 },
    { id: 't4', num: 4, seats: 2 },
  ])
  assert.ok(result)
  assert.deepEqual(result.selectedNums.sort((a, b) => a - b), [1, 2, 3])
  assert.deepEqual(result.selectedIds, ['t3', 't1'])
})

test('rejects non-contiguous combinations', () => {
  const result = planAdjacentMerge(2, 2, 6, [
    { id: 't4', num: 4, seats: 2 },
    { id: 't5', num: 5, seats: 2 },
  ])
  assert.equal(result, null)
})
