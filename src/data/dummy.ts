export interface Reservation {
  id: string
  name: string
  partySize: number
  startTime: string   // "12:00"
  endTime: string     // "14:00"
  period: 'lunch' | 'dinner'
  phone: string
  status: 'waiting' | 'seated' | 'completed'
  tableId?: string    // 착석한 테이블 ID
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
  mergedFrom?: string[]  // 병합 원본 테이블 ID (분할 복원용)
}

// 테이블 크기 상수 (축소)
export const TABLE_WIDTH = 72
export const TABLE_BASE_HEIGHT = 60
export const TABLE_HEIGHT_PER_EXTRA = 18

// 스냅 그리드 크기
export const SNAP_SIZE = 12

// 예약 시간 고정 간격 (1시간 30분 = 90분)
export const RESERVATION_DURATION = 90

export function getTableHeight(seats: number): number {
  if (seats <= 2) return TABLE_BASE_HEIGHT
  return TABLE_BASE_HEIGHT + (seats - 2) * TABLE_HEIGHT_PER_EXTRA
}

export function snapToGrid(value: number): number {
  return Math.round(value / SNAP_SIZE) * SNAP_SIZE
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

// 시작 시간에서 1시간 30분 뒤를 자동 계산
export function getFixedEndTime(startTime: string): string {
  const mins = timeToMinutes(startTime) + RESERVATION_DURATION
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function getPeriodFromTime(time: string): 'lunch' | 'dinner' {
  const minutes = timeToMinutes(time)
  return minutes < 17 * 60 ? 'lunch' : 'dinner'
}

// 프랑스 전화번호 포맷: 06 12 34 56 78 or +33 6 12 34 56 78
export function formatFrenchPhone(value: string): string {
  // 숫자만 추출
  const digits = value.replace(/\D/g, '')

  // +33으로 시작하는 경우
  if (digits.startsWith('33') && digits.length > 2) {
    const local = digits.slice(2)
    if (local.length <= 1) return `+33 ${local}`
    const parts = local.match(/.{1,2}/g) || []
    return `+33 ${parts.join(' ')}`
  }

  // 0으로 시작하는 일반 번호
  if (digits.length <= 2) return digits
  const parts = digits.match(/.{1,2}/g) || []
  return parts.join(' ')
}
