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

function resetStores() {
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
    focusedTableId: 't1',
    mergePreviewTableIds: [],
    activeSession: 'lunch',
    _undoSnapshot: null,
    _undoLabel: null,
    _undoStack: [],
  })
  useToastStore.setState({ toasts: [] })
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

function walkInPlusButton(container: HTMLElement): HTMLButtonElement {
  const buttons = [...container.querySelectorAll('button')]
    .filter((b) => b.className.includes('w-6') && b.className.includes('h-6'))
  if (buttons.length < 2) throw new Error('walk-in +/- buttons not found')
  return buttons[1] as HTMLButtonElement
}

describe('ControlPanel walk-in manual merge UI', () => {
  beforeEach(() => {
    resetStores()
  })

  test('opens manual merge selection panel when walk-in size exceeds focused table seats', () => {
    const { container, unmount } = renderPanel()
    try {
      click(buttonByText(container, '워크인 배정'))
      click(walkInPlusButton(container)) // 2 -> 3
      click(buttonByText(container, '배정'))

      expect(container.innerHTML).toContain('워크인 3명 병합 배정')
      expect(container.innerHTML).toContain('선택 병합으로 배정')
    } finally {
      unmount()
    }
  })

  test('submit button remains disabled until selected merge seats are enough', () => {
    const { container, unmount } = renderPanel()
    try {
      click(buttonByText(container, '워크인 배정'))
      click(walkInPlusButton(container)) // 2 -> 3
      click(walkInPlusButton(container)) // 3 -> 4
      click(walkInPlusButton(container)) // 4 -> 5
      click(buttonByText(container, '배정'))

      const submit = buttonByText(container, '선택 병합으로 배정')
      expect(submit.disabled).toBe(true)

      const mergeButtons = [...container.querySelectorAll('button')]
        .filter((b) => /^T\d+ · \d+$/.test(normalizedText(b)))
      expect(mergeButtons.length).toBeGreaterThanOrEqual(2)

      click(mergeButtons[0] as HTMLButtonElement)
      expect(submit.disabled).toBe(true)

      click(mergeButtons[1] as HTMLButtonElement)
      expect(submit.disabled).toBe(false)
      expect(container.innerHTML).toContain('선택 좌석: 6 / 필요 좌석: 5')
    } finally {
      unmount()
    }
  })

  test('manual merge submit seats walk-in on a merged table', () => {
    const { container, unmount } = renderPanel()
    try {
      click(buttonByText(container, '워크인 배정'))
      click(walkInPlusButton(container)) // 2 -> 3
      click(walkInPlusButton(container)) // 3 -> 4
      click(buttonByText(container, '배정'))

      const submit = buttonByText(container, '선택 병합으로 배정')
      const mergeButtons = [...container.querySelectorAll('button')]
        .filter((b) => /^T\d+ · \d+$/.test(normalizedText(b)))
      expect(mergeButtons.length).toBeGreaterThanOrEqual(1)
      click(mergeButtons[0] as HTMLButtonElement)
      expect(submit.disabled).toBe(false)
      click(submit)

      const seated = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.name === '워크인')
      expect(seated).toBeTruthy()
      expect(seated?.status).toBe('occupied')
      expect(seated?.mergedFrom?.length).toBeGreaterThanOrEqual(2)
      expect(container.innerHTML).not.toContain('워크인 4명 병합 배정')
    } finally {
      unmount()
    }
  })

  test('cancel in manual merge panel closes panel without seating walk-in', () => {
    const { container, unmount } = renderPanel()
    try {
      click(buttonByText(container, '워크인 배정'))
      click(walkInPlusButton(container)) // 2 -> 3
      click(buttonByText(container, '배정'))

      expect(container.innerHTML).toContain('워크인 3명 병합 배정')
      click(buttonByText(container, '취소'))

      expect(container.innerHTML).not.toContain('워크인 3명 병합 배정')
      const seated = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.name === '워크인')
      expect(seated).toBeFalsy()
    } finally {
      unmount()
    }
  })

  test('switching focused table keeps draft walk-in state and updates base table context', async () => {
    const { container, unmount } = renderPanel()
    try {
      click(buttonByText(container, '워크인 배정'))
      click(walkInPlusButton(container)) // 2 -> 3
      click(buttonByText(container, '배정'))
      expect(container.innerHTML).toContain('워크인 3명 병합 배정')

      flushSync(() => {
        useReservationStore.getState().setFocusedTable('t2')
      })
      await Promise.resolve()

      expect(container.innerHTML).toContain('워크인 3명 병합 배정')
      expect(container.innerHTML).toContain('(기준: T2 2석)')
    } finally {
      unmount()
    }
  })

  test('double submit does not create duplicate merged walk-in seating', () => {
    const { container, unmount } = renderPanel()
    try {
      click(buttonByText(container, '워크인 배정'))
      click(walkInPlusButton(container)) // 2 -> 3
      click(walkInPlusButton(container)) // 3 -> 4
      click(buttonByText(container, '배정'))

      const mergeButtons = [...container.querySelectorAll('button')]
        .filter((b) => /^T\d+ · \d+$/.test(normalizedText(b)))
      click(mergeButtons[0] as HTMLButtonElement)

      const submit = buttonByText(container, '선택 병합으로 배정')
      click(submit)

      const firstMerged = useReservationStore.getState().getEffectiveTables().find((t) => t.currentTeam?.name === '워크인')
      expect(firstMerged).toBeTruthy()

      // Attempt a second submit if stale button still exists.
      const secondSubmit = [...container.querySelectorAll('button')]
        .find((b) => normalizedText(b) === '선택 병합으로 배정') as HTMLButtonElement | undefined
      if (secondSubmit) {
        click(secondSubmit)
      }

      const current = useReservationStore.getState()
      const allWalkins = current.getEffectiveTables().filter((t) => t.currentTeam?.name === '워크인')
      expect(allWalkins.length).toBe(1)
      expect(current.sessionData.lunch.merges.length).toBe(1)
    } finally {
      unmount()
    }
  })

  test('T16 walk-in merge keeps submit disabled for non-contiguous selection', () => {
    const { container, unmount } = renderPanel()
    try {
      flushSync(() => {
        useReservationStore.getState().setFocusedTable('t16')
      })

      click(buttonByText(container, '워크인 배정'))
      click(buttonByText(container, '배정'))

      const submit = buttonByText(container, '선택 병합으로 배정')
      expect(submit.disabled).toBe(true)

      click(buttonByText(container, 'T13 · 1'))
      expect(container.innerHTML).toContain('연속된 테이블만 함께 병합할 수 있습니다.')
      expect(submit.disabled).toBe(true)

      click(buttonByText(container, 'T13 · 1'))
      click(buttonByText(container, 'T15 · 1'))
      expect(submit.disabled).toBe(false)
    } finally {
      unmount()
    }
  })
})
