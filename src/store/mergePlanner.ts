export interface MergePlannerCandidate {
  id: string
  num: number
  seats: number
}

export interface MergePlannerResult {
  selectedIds: string[]
  selectedNums: number[]
}

function isContiguous(nums: number[]) {
  if (nums.length <= 1) return true
  const sorted = [...nums].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}

export function planAdjacentMerge(
  baseNum: number,
  baseSeats: number,
  partySize: number,
  candidates: MergePlannerCandidate[]
): MergePlannerResult | null {
  if (partySize <= baseSeats) {
    return { selectedIds: [], selectedNums: [baseNum] }
  }

  const needed = partySize - baseSeats
  let extra = 0
  const selected: MergePlannerCandidate[] = []
  let lo = baseNum - 1
  let hi = baseNum + 1

  while (extra < needed && (lo >= 1 || hi <= 100)) {
    const hiCandidate = candidates.find((c) => c.num === hi && !selected.some((s) => s.id === c.id))
    if (hiCandidate) {
      selected.push(hiCandidate)
      extra += hiCandidate.seats
      if (extra >= needed) break
    }

    const loCandidate = candidates.find((c) => c.num === lo && !selected.some((s) => s.id === c.id))
    if (loCandidate) {
      selected.push(loCandidate)
      extra += loCandidate.seats
      if (extra >= needed) break
    }

    hi++
    lo--
  }

  const nums = [baseNum, ...selected.map((c) => c.num)]
  if (extra < needed || !isContiguous(nums)) return null

  return {
    selectedIds: selected.map((c) => c.id),
    selectedNums: nums,
  }
}

