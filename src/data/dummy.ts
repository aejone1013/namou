export interface Reservation {
  id: string
  name: string
  partySize: number
  time: string
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

export const dummyReservations: Reservation[] = [
  {
    id: 'r1',
    name: '김민수',
    partySize: 4,
    time: '18:00',
    phone: '06 12 34 56 78',
    status: 'waiting',
    note: '창가 자리 요청',
  },
  {
    id: 'r2',
    name: '이서연',
    partySize: 2,
    time: '18:30',
    phone: '07 65 43 21 09',
    status: 'waiting',
  },
  {
    id: 'r3',
    name: '박지훈',
    partySize: 6,
    time: '19:00',
    phone: '06 55 12 34 00',
    status: 'seated',
    note: '생일 파티',
  },
  {
    id: 'r4',
    name: '최유진',
    partySize: 3,
    time: '19:00',
    phone: '07 77 88 99 00',
    status: 'waiting',
  },
  {
    id: 'r5',
    name: '정하은',
    partySize: 2,
    time: '19:30',
    phone: '06 33 44 55 66',
    status: 'waiting',
    note: '알레르기 주의',
  },
  {
    id: 'r6',
    name: '한도윤',
    partySize: 5,
    time: '20:00',
    phone: '07 66 99 88 11',
    status: 'waiting',
  },
]

// 실제 식당 레이아웃 예시: 입구(하단) → 홀 → 창가(상단)
export const dummyTables: TableInfo[] = [
  // 창가 쪽 (상단) - 2인 테이블
  {
    id: 't1',
    label: '창가1',
    shape: 'rectangle',
    seats: 2,
    x: 50,
    y: 40,
    width: 120,
    height: 80,
    status: 'available',
  },
  {
    id: 't2',
    label: '창가2',
    shape: 'rectangle',
    seats: 2,
    x: 210,
    y: 40,
    width: 120,
    height: 80,
    status: 'occupied',
    reservation: '이서연 (2명)',
    reservationId: 'r2',
  },
  {
    id: 't3',
    label: '창가3',
    shape: 'rectangle',
    seats: 2,
    x: 370,
    y: 40,
    width: 120,
    height: 80,
    status: 'available',
  },
  // 홀 중앙 - 4인 사각 테이블
  {
    id: 't4',
    label: '홀1',
    shape: 'rectangle',
    seats: 4,
    x: 60,
    y: 220,
    width: 150,
    height: 95,
    status: 'reserved',
    reservation: '김민수 (4명)',
    reservationId: 'r1',
  },
  {
    id: 't5',
    label: '홀2',
    shape: 'rectangle',
    seats: 4,
    x: 270,
    y: 220,
    width: 150,
    height: 95,
    status: 'available',
  },
  // 벽쪽 단체석 (우측)
  {
    id: 't6',
    label: '단체석',
    shape: 'rectangle',
    seats: 8,
    x: 490,
    y: 180,
    width: 170,
    height: 140,
    status: 'occupied',
    reservation: '박지훈 (6명)',
    reservationId: 'r3',
  },
  // 입구 쪽 (하단) - 바 좌석 / 대기 테이블
  {
    id: 't7',
    label: '바1',
    shape: 'rectangle',
    seats: 2,
    x: 120,
    y: 430,
    width: 120,
    height: 80,
    status: 'available',
  },
  {
    id: 't8',
    label: '바2',
    shape: 'rectangle',
    seats: 2,
    x: 280,
    y: 430,
    width: 120,
    height: 80,
    status: 'available',
  },
]
