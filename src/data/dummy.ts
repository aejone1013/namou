export interface Reservation {
  id: string
  name: string
  partySize: number
  startTime: string   // "12:00"
  endTime: string     // "14:00"
  period: 'lunch' | 'dinner'
  phone: string
  status: 'waiting' | 'seated' | 'completed'
  note?: string
}

export interface TableInfo {
  id: string
  label: string
  shape: 'rectangle'
  seats: number
  x: number
  y: number
  width: number
  height: number
  status: 'available' | 'occupied' | 'reserved'
  reservation?: string
  reservationId?: string
}

// 테이블 크기 상수
export const TABLE_WIDTH = 100
export const TABLE_BASE_HEIGHT = 80
export const TABLE_HEIGHT_PER_EXTRA = 25

export function getTableHeight(seats: number): number {
  if (seats <= 2) return TABLE_BASE_HEIGHT
  return TABLE_BASE_HEIGHT + (seats - 2) * TABLE_HEIGHT_PER_EXTRA
}

// 시간 생성 유틸
function generateTimes(startH: number, startM: number, endH: number, endM: number): string[] {
  const times: string[] = []
  let h = startH
  let m = startM
  const endTotal = endH * 60 + endM
  while (h * 60 + m <= endTotal) {
    times.push(`${h}:${String(m).padStart(2, '0')}`)
    m += 15
    if (m >= 60) { h++; m = 0 }
  }
  return times
}

export const LUNCH_TIMES = generateTimes(12, 0, 14, 0)
export const DINNER_TIMES = generateTimes(19, 0, 21, 30)

export function getStartTimeOptions(period: 'lunch' | 'dinner'): string[] {
  return period === 'lunch' ? LUNCH_TIMES : DINNER_TIMES
}

export function getEndTimeOptions(startTime: string, period: 'lunch' | 'dinner'): string[] {
  const times = period === 'lunch' ? LUNCH_TIMES : DINNER_TIMES
  const startIdx = times.indexOf(startTime)
  if (startIdx === -1) return []
  return times.slice(startIdx + 1)
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function getPeriodFromTime(time: string): 'lunch' | 'dinner' {
  const minutes = timeToMinutes(time)
  return minutes < 17 * 60 ? 'lunch' : 'dinner'
}
