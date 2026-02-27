import { beforeEach, describe, expect, test } from 'vitest'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import type { ReactNode } from 'react'
import type { TableInfo, SessionData } from '@/data/dummy'
import { createDefaultTables } from '@/data/dummy'
import NextBookingSection from './NextBookingSection'
import TableShape from '@/components/TableShape'
import { useReservationStore } from '@/store/useReservationStore'

function emptySessionData(): { lunch: SessionData; dinner: SessionData } {
  return {
    lunch: { tableStates: {}, merges: [] },
    dinner: { tableStates: {}, merges: [] },
  }
}

function resetStore() {
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
    focusedTableId: null,
    mergePreviewTableIds: [],
    activeSession: 'lunch',
    _undoSnapshot: null,
    _undoLabel: null,
    _undoStack: [],
  })
}

function renderClient(element: ReactNode): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  flushSync(() => {
    root.render(<>{element}</>)
  })
  const html = container.innerHTML
  flushSync(() => {
    root.unmount()
  })
  container.remove()
  return html
}

function setupMergedScenario() {
  const store = useReservationStore.getState()
  store.setActiveSession('lunch')

  store.addReservation({
    name: 'A',
    partySize: 6,
    period: 'lunch',
    startTime: '12:00',
    endTime: '13:30',
    phone: '',
    note: '',
  })
  store.addReservation({
    name: 'B',
    partySize: 3,
    period: 'lunch',
    startTime: '13:30',
    endTime: '15:00',
    phone: '',
    note: '',
  })
  store.addReservation({
    name: 'C',
    partySize: 2,
    period: 'lunch',
    startTime: '13:30',
    endTime: '15:00',
    phone: '',
    note: '',
  })

  const stateAfterAdd = useReservationStore.getState()
  const A = stateAfterAdd.reservations.find((r) => r.name === 'A')
  const B = stateAfterAdd.reservations.find((r) => r.name === 'B')
  const C = stateAfterAdd.reservations.find((r) => r.name === 'C')
  if (!A || !B || !C) throw new Error('failed to create A/B/C reservations')

  store.setNextBookingMulti(['t1', 't2', 't3'], A.id, 'T1-3')
  store.seatWithSelectedMerge(A.id, 't1', ['t2', 't3'])
  store.setNextBookingMulti(['t1', 't2'], B.id, 'T1-2')
  store.setNextBookingMulti(['t3'], C.id, 'T3')

  const current = useReservationStore.getState()
  const mergedTable = current.getEffectiveTables().find((t) => t.currentTeam?.reservationId === A.id) as TableInfo
  if (!mergedTable) throw new Error('merged occupied table for A not found')
  return { mergedTable, A, B, C }
}

describe('NextBookingSection UI regression', () => {
  beforeEach(() => {
    resetStore()
  })

  test('shows B and C in next-booking block with table labels on occupied merged table', () => {
    const { mergedTable, B, C } = setupMergedScenario()
    const lunchStates = useReservationStore.getState().sessionData.lunch.tableStates
    expect(lunchStates.t1?.plannedBookings?.some((p) => p.reservationId === B.id)).toBe(true)
    expect(lunchStates.t2?.plannedBookings?.some((p) => p.reservationId === B.id)).toBe(true)
    expect(lunchStates.t3?.plannedBookings?.some((p) => p.reservationId === C.id)).toBe(true)

    const html = renderClient(
      <NextBookingSection
        table={mergedTable}
        waitingReservations={[]}
        showNextBookingSelect={false}
        setShowNextBookingSelect={() => {}}
        onSetNextBooking={() => {}}
        onSetNextBookingMulti={() => {}}
        onClearNextBooking={() => {}}
        onSetTargetLabel={() => {}}
      />
    )

    expect(html).toContain('다음 예약')
    expect(html).toContain('B')
    expect(html).toContain('13:30 ~ 15:00')
    expect(html).toContain('T1-2')
    expect(html).toContain('C')
    expect(html).toContain('T3')
  })

  test('shows reservation badge on merged table when bookings exist only on origin tables', () => {
    const { mergedTable } = setupMergedScenario()

    const html = renderClient(<TableShape table={mergedTable} />)
    expect(html).toContain('예약 배정 2건')
  })
})
