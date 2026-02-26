import { useState, useRef, useEffect } from 'react'
import { Settings, RotateCcw, Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'

export default function FunctionMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'reservations' | 'layout' | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const { resetReservations, resetSetup, toggleEditMode, isEditMode } = useReservationStore()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
        setConfirmAction(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleResetReservations = () => {
    if (confirmAction === 'reservations') {
      resetReservations()
      setConfirmAction(null)
      setIsOpen(false)
    } else {
      setConfirmAction('reservations')
    }
  }

  const handleResetLayout = () => {
    if (confirmAction === 'layout') {
      resetSetup()
      setConfirmAction(null)
      setIsOpen(false)
    } else {
      setConfirmAction('layout')
    }
  }

  const handleEditLayout = () => {
    if (!isEditMode) {
      toggleEditMode()
    }
    setIsOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setConfirmAction(null)
        }}
        className={cn(
          'w-8 h-8 flex items-center justify-center rounded-xl',
          'transition-colors',
          isOpen
            ? 'bg-primary text-white'
            : 'text-charcoal-lighter hover:text-charcoal hover:bg-cream'
        )}
      >
        <Settings size={18} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full right-0 mt-2 w-[200px] z-50',
            'bg-surface rounded-2xl border border-border',
            'shadow-xl shadow-charcoal/10',
            'overflow-hidden'
          )}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[11px] font-semibold text-charcoal-lighter">기능 메뉴</p>
          </div>

          <div className="p-1.5 space-y-0.5">
            {/* 배치 편집 */}
            {!isEditMode && (
              <button
                onClick={handleEditLayout}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl',
                  'text-xs font-medium text-charcoal',
                  'hover:bg-cream transition-colors'
                )}
              >
                <Pencil size={14} className="text-charcoal-lighter" />
                배치 편집
              </button>
            )}

            {/* 예약 초기화 */}
            <button
              onClick={handleResetReservations}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl',
                'text-xs font-medium transition-colors',
                confirmAction === 'reservations'
                  ? 'text-occupied bg-occupied-light'
                  : 'text-charcoal hover:bg-cream'
              )}
            >
              <RotateCcw size={14} className={confirmAction === 'reservations' ? 'text-occupied' : 'text-charcoal-lighter'} />
              {confirmAction === 'reservations' ? '정말 초기화할까요?' : '예약 초기화'}
            </button>

            {/* 테이블 배치 초기화 */}
            <button
              onClick={handleResetLayout}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl',
                'text-xs font-medium transition-colors',
                confirmAction === 'layout'
                  ? 'text-occupied bg-occupied-light'
                  : 'text-charcoal hover:bg-cream'
              )}
            >
              <Trash2 size={14} className={confirmAction === 'layout' ? 'text-occupied' : 'text-charcoal-lighter'} />
              {confirmAction === 'layout' ? '정말 초기화할까요?' : '테이블 배치 초기화'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
