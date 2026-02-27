import type { ToastAction } from '@/store/useToastStore'

export const toastMessages = {
  seatingFailedNoCapacity: '좌석이 부족합니다. 인접 테이블을 확보해주세요.',
  moveFailedNoCapacity: '좌석 수가 부족하여 이동할 수 없습니다.',
  reservationsReset: '예약이 초기화되었습니다.',
  settingsReset: '설정이 초기화되었습니다.',
  tableCleared: '테이블을 비웠습니다.',
  tableDeleted: '테이블이 삭제되었습니다.',
} as const

export const toastActions = {
  undo: (onClick: () => void): ToastAction => ({
    label: '되돌리기',
    onClick,
  }),
}

