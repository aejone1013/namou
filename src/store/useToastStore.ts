import { create } from 'zustand'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  message: string
  type: 'info' | 'error' | 'success'
  action?: ToastAction
}

interface ToastStore {
  toasts: Toast[]
  show: (message: string, type?: Toast['type'], action?: ToastAction) => void
  dismiss: (id: string) => void
}

let toastCounter = 0
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearToastTimer(id: string) {
  const timer = toastTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    toastTimers.delete(id)
  }
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (message, type = 'info', action) => {
    const id = `toast-${++toastCounter}`
    const toast: Toast = { id, message, type, action }
    let droppedIds: string[] = []

    set((state) => ({
      toasts: (() => {
        droppedIds = state.toasts.slice(0, Math.max(0, state.toasts.length - 2)).map((t) => t.id)
        return [...state.toasts.slice(-2), toast] // max 3
      })(),
    }))
    droppedIds.forEach(clearToastTimer)

    const delay = action ? 5000 : 3000
    clearToastTimer(id)
    const timer = setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
      toastTimers.delete(id)
    }, delay)
    toastTimers.set(id, timer)
  },
  dismiss: (id) => {
    clearToastTimer(id)
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))
