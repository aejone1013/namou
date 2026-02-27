import { timeToMinutes } from '../data/dummy.ts'
import type { NextBooking, Reservation } from '../data/dummy.ts'

type TimeRange = Pick<NextBooking, 'startTime' | 'endTime'>

export function timeRangesOverlap(a: TimeRange, b: TimeRange): boolean {
  const aStart = timeToMinutes(a.startTime)
  const aEnd = timeToMinutes(a.endTime)
  const bStart = timeToMinutes(b.startTime)
  const bEnd = timeToMinutes(b.endTime)
  return aStart < bEnd && bStart < aEnd
}

export function reservationOverlapsBooking(reservation: Pick<Reservation, 'startTime' | 'endTime'>, booking: TimeRange): boolean {
  return timeRangesOverlap(reservation, booking)
}

export function bookingConflictsOnSameTable(existing: NextBooking, candidate: TimeRange, candidateReservationId?: string): boolean {
  if (candidateReservationId && existing.reservationId === candidateReservationId) return false
  return timeRangesOverlap(existing, candidate)
}

export function bookingScopesOverlap(a?: string[] | null, b?: string[] | null): boolean {
  if (!a?.length || !b?.length) return false
  const setA = new Set(a)
  return b.some((id) => setA.has(id))
}

export function mergeFuturePlannedBookingsForMergedSeat(
  bookingsByTableId: Record<string, NextBooking[]>,
  tableIds: string[],
  excludeReservationId?: string
): NextBooking[] {
  const merged = new Map<string, NextBooking>()

  for (const tableId of tableIds) {
    for (const booking of bookingsByTableId[tableId] ?? []) {
      if (excludeReservationId && booking.reservationId === excludeReservationId) continue
      const key = `${booking.reservationId}|${booking.startTime}|${booking.endTime}|${booking.targetLabel ?? ''}`
      const prev = merged.get(key)
      if (!prev) {
        merged.set(key, { ...booking, scopeTableIds: booking.scopeTableIds ? [...booking.scopeTableIds] : undefined })
        continue
      }
      const combinedScope = [...new Set([...(prev.scopeTableIds ?? []), ...(booking.scopeTableIds ?? [])])]
      merged.set(key, { ...prev, scopeTableIds: combinedScope.length > 0 ? combinedScope : prev.scopeTableIds })
    }
  }

  return [...merged.values()].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
}

export function selectSimultaneousScopedAutoSeatBookings(
  bookings: NextBooking[],
  restoredTableIds: string[]
): Array<NextBooking & { scopeTableIds: string[] }> {
  if (bookings.length === 0) return []
  const earliestStart = [...bookings].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))[0]?.startTime
  if (!earliestStart) return []

  const restored = new Set(restoredTableIds)
  const candidates = bookings
    .filter((b) => b.startTime === earliestStart)
    .map((b) => ({
      ...b,
      scopeTableIds: (b.scopeTableIds ?? []).filter((id) => restored.has(id)),
    }))
    .filter((b): b is NextBooking & { scopeTableIds: string[] } => b.scopeTableIds.length > 0)
    .sort((a, b) => b.scopeTableIds.length - a.scopeTableIds.length)

  const selected: Array<NextBooking & { scopeTableIds: string[] }> = []
  for (const candidate of candidates) {
    if (selected.some((s) => bookingScopesOverlap(s.scopeTableIds, candidate.scopeTableIds))) continue
    selected.push(candidate)
  }
  return selected
}
