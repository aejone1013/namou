export type NextBookingClearDecision = 'auto-seat' | 'keep-next-booking'

export function decideNextBookingOnBaseTableClear(baseSeats: number, partySize: number): NextBookingClearDecision {
  return partySize > baseSeats ? 'keep-next-booking' : 'auto-seat'
}
