import { beforeEach, describe, expect, test } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createDefaultTables } from '@/data/dummy'
import type { SessionData } from '@/data/dummy'
import ControlPanel from '@/components/ControlPanel'
import { useReservationStore } from '@/store/useReservationStore'
import { useToastStore } from '@/store/useToastStore'

function emptySessionData(): { lunch: SessionData; dinner: SessionData } {
  return {
    lunch: { tableStates: {}, merges: [] },
    dinner: { tableStates: {}, merges: [] },
  }
}

function resetStores(focusedTableId: string) {
  ;(useReservationStore as unknown as { persist?: { clearStorage?: () => void } }).persist?.clearStorage?.()
  useReservationStore.setState({
    reservations: [],
    tables: createDefaultTables(),
    sessionData: emptySessionData(),
    isModalOpen: false,
    isEditMode: false,
    selectedTableIds: [],
    isSetupComplete: true,
    editingReservation: null,
    focusedTableId,
    mergePreviewTableIds: [],
    activeSession: 'lunch',
    _undoSnapshot: null,
    _undoLabel: null,
    _undoStack: [],
  })
  useToastStore.setState({ toasts: [] })
}

function addReservation(params: {
  name: string
  partySize: number
  startTime: string
  endTime: string
  period?: 'lunch' | 'dinner'
}) {
  const store = useReservationStore.getState()
  store.addReservation({
    name: params.name,
    partySize: params.partySize,
    startTime: params.startTime,
    endTime: params.endTime,
    period: params.period ?? 'lunch',
    phone: '',
    note: '',
  })
  const r = useReservationStore.getState().reservations.find((x) => x.name === params.name)
  if (!r) throw new Error(`Reservation ${params.name} not found`)
  return r
}

function renderPanel(): { container: HTMLDivElement; root: Root; unmount: () => void } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  flushSync(() => {
    root.render(<ControlPanel />)
  })
  return {
    container,
    root,
    unmount: () => {
      flushSync(() => root.unmount())
      container.remove()
    },
  }
}

function normalizedText(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const buttons = [...container.querySelectorAll('button')]
  const found = buttons.find((b) => normalizedText(b) === text)
  if (!found) throw new Error(`button not found: ${text}`)
  return found as HTMLButtonElement
}

function click(el: HTMLElement) {
  flushSync(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('ControlPanel manual merge UI', () => {
  beforeEach(() => {
    resetStores('t1')
  })

  test('merge seat button toggles enabled/disabled as selection changes', () => {
    const reservation = addReservation({
      name: 'Large-4',
      partySize: 4,
      startTime: '12:00',
      endTime: '13:30',
      period: 'lunch',
    })
    useReservationStore.getState().setNextBookingMulti(['t1'], reservation.id, 'T1')

    const { container, unmount } = renderPanel()
    try {
      const seatButton = buttonByText(container, '선택 병합으로 착석')
      expect(seatButton.disabled).toBe(true)

      const candidate = buttonByText(container, 'T2 · 2')
      click(candidate)
      expect(seatButton.disabled).toBe(false)
      expect(container.innerHTML).toContain('필요 좌석을 충족했습니다.')

      click(candidate)
      expect(seatButton.disabled).toBe(true)
    } finally {
      unmount()
    }
  })

  test('shows non-contiguous warning when sparse merge selection is made', () => {
    resetStores('t2')
    const reservation = addReservation({
      name: 'Large-8',
      partySize: 8,
      startTime: '12:00',
      endTime: '13:30',
      period: 'lunch',
    })
    useReservationStore.getState().setNextBookingMulti(['t2'], reservation.id, 'T2')

    const { container, unmount } = renderPanel()
    try {
      click(buttonByText(container, 'T1 · 2'))
      click(buttonByText(container, 'T4 · 2'))

      expect(container.innerHTML).toContain('연속된 테이블만 함께 병합할 수 있습니다.')
      expect(buttonByText(container, '선택 병합으로 착석').disabled).toBe(true)
    } finally {
      unmount()
    }
  })

  test('manual merge submit seats reservation on merged table', () => {
    const reservation = addReservation({
      name: 'Large-4',
      partySize: 4,
      startTime: '12:00',
      endTime: '13:30',
      period: 'lunch',
    })
    useReservationStore.getState().setNextBookingMulti(['t1'], reservation.id, 'T1')

    const { container, unmount } = renderPanel()
    try {
      click(buttonByText(container, 'T2 · 2'))
      const seatButton = buttonByText(container, '선택 병합으로 착석')
      expect(seatButton.disabled).toBe(false)
      click(seatButton)

      const state = useReservationStore.getState()
      const res = state.reservations.find((r) => r.id === reservation.id)
      const merged = state.getEffectiveTables().find((t) => t.currentTeam?.reservationId === reservation.id)
      expect(res?.status).toBe('seated')
      expect(merged).toBeTruthy()
      expect(merged?.mergedFrom?.map((o) => o.id).sort()).toEqual(['t1', 't2'])
      expect(container.innerHTML).not.toContain('선택 병합으로 착석')
    } finally {
      unmount()
    }
  })
})

