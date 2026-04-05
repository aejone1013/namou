import { useEffect, useRef, useState } from 'react'
import { Users, Sun, Moon, Clock, Settings, Pencil, RotateCcw, Trash2, LogOut } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useMobileLayout } from '@/hooks/useMobileLayout'
import { getPlatform } from '@/lib/platform'
import { useReservationStore } from '@/store/useReservationStore'
import { useToastStore } from '@/store/useToastStore'
import { toastActions, toastMessages } from '@/features/toast/toastPresets'

interface MapTopBarProps {
  showTimeTable?: boolean
  onToggleTimeTable?: () => void
}

export default function MapTopBar({ showTimeTable, onToggleTimeTable }: MapTopBarProps) {
  const store = useReservationStore()
  const toast = useToastStore()
  const isMobile = useMobileLayout()
  const platform = getPlatform()
  const menuRef = useRef<HTMLDivElement>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'reservations' | 'setup' | null>(null)
  const {
    tables: baseTables,
    reservations,
    isEditMode,
    activeSession,
    setActiveSession,
    toggleEditMode,
    resetReservations,
    resetSetup,
    saveUndoSnapshot,
    undo,
  } = store

  const tables = isEditMode ? baseTables : store.getEffectiveTables()
  const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0)
  const occupiedSeats = tables
    .filter((t) => {
      if (t.status !== 'occupied' || !t.currentTeam) return false
      if (!t.currentTeam.reservationId) return true
      const res = reservations.find((r) => r.id === t.currentTeam!.reservationId)
      return !res || res.period === activeSession
    })
    .reduce((sum, t) => sum + t.seats, 0)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false)
        setConfirmAction(null)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const handleCloseTransientUi = () => {
      setIsSettingsOpen(false)
      setConfirmAction(null)
    }

    window.addEventListener('namou:request-close-transient-ui', handleCloseTransientUi)
    return () => window.removeEventListener('namou:request-close-transient-ui', handleCloseTransientUi)
  }, [])

  const handleQuitApp = () => {
    if (!window.confirm('앱을 종료할까요?')) return
    if (window.namouDesktop?.quitApp) {
      window.namouDesktop.quitApp()
      return
    }
    window.close()
  }

  return (
    <div
      className={cn(
        'relative z-[60] overflow-visible bg-surface/70 backdrop-blur-sm border-b border-border',
        isMobile
          ? 'safe-area-top min-h-[calc(52px+env(safe-area-inset-top,0px))] px-3 py-2 flex items-center justify-between gap-2'
          : 'h-11 flex items-center justify-between px-4'
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1 bg-cream rounded-lg p-1">
          <button
            onClick={() => setActiveSession('lunch')}
            className={cn(
              'inline-flex items-center gap-1 text-[12px] font-medium rounded-md transition-all duration-150 min-h-[40px]',
              isMobile ? 'px-3' : 'px-2.5 py-1',
              activeSession === 'lunch'
                ? 'bg-[#F3D17A] text-[#3A2412] border border-[#D0A642] shadow-sm'
                : 'text-charcoal-lighter hover:text-charcoal-light hover:bg-surface/60'
            )}
          >
            <Sun size={isMobile ? 13 : 11} />
            점심
          </button>
          <button
            onClick={() => setActiveSession('dinner')}
            className={cn(
              'inline-flex items-center gap-1 text-[12px] font-medium rounded-md transition-all duration-150 min-h-[40px]',
              isMobile ? 'px-3' : 'px-2.5 py-1',
              activeSession === 'dinner'
                ? 'bg-[#5A6FAE] text-white border border-[#4A5F9A] shadow-sm'
                : 'text-charcoal-lighter hover:text-charcoal-light hover:bg-surface/60'
            )}
          >
            <Moon size={isMobile ? 13 : 11} />
            저녁
          </button>
        </div>
      </div>

      <div className={cn('flex items-center', isMobile ? 'gap-1.5 ml-2' : 'gap-2 ml-4')}>
        <div className={cn('items-center gap-1.5', isMobile ? 'hidden' : 'flex')}>
          <Users size={14} className="text-primary" />
          <span className="text-sm font-semibold text-charcoal">{occupiedSeats}</span>
          <span className="text-sm text-charcoal-lighter">/</span>
          <span className="text-sm text-charcoal-light">{totalSeats}</span>
          <span className="text-[12px] text-charcoal-lighter">좌석</span>
        </div>

        {!isEditMode && (
          <div className={cn('items-center gap-2 text-[12px] ml-1 mr-1', isMobile ? 'hidden' : 'flex')}>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-available" />
              {tables.filter((t) => t.status === 'available').length}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-occupied" />
              {tables.filter((t) => t.status === 'occupied').length}
            </span>
          </div>
        )}

        <button
          onClick={toggleEditMode}
          className={cn(
            'inline-flex items-center gap-1 text-[12px] font-semibold rounded-lg border transition-colors min-h-[40px]',
            isMobile ? 'px-3' : 'px-2.5 py-1',
            isEditMode
              ? 'bg-primary text-white border-primary'
              : 'bg-cream text-charcoal border-border hover:bg-border'
          )}
          title={isEditMode ? '편집 완료' : '배치 편집'}
        >
          <Pencil size={12} />
          {isEditMode ? '편집 완료' : '배치 편집'}
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => {
              setIsSettingsOpen((v) => !v)
              setConfirmAction(null)
            }}
            className={cn(
              'inline-flex items-center gap-1 text-[12px] font-semibold rounded-lg border transition-colors min-h-[40px]',
              isMobile ? 'px-3' : 'px-2.5 py-1',
              isSettingsOpen
                ? 'bg-primary text-white border-primary'
                : 'bg-cream text-charcoal border-border hover:bg-border'
            )}
            title="설정"
          >
            <Settings size={12} />
            설정
          </button>

          {isSettingsOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-[210px] z-[80] rounded-xl border border-border bg-surface shadow-lg p-1.5">
              <div className="space-y-1">
              <button
                onClick={() => {
                  if (confirmAction === 'reservations') {
                    saveUndoSnapshot('예약 초기화')
                    resetReservations()
                    toast.show(toastMessages.reservationsReset, 'info', toastActions.undo(() => undo()))
                    setConfirmAction(null)
                    setIsSettingsOpen(false)
                    return
                  }
                  setConfirmAction('reservations')
                }}
                className="w-full inline-flex items-center gap-1.5 text-[12px] font-semibold px-2 py-1.5 rounded-lg bg-cream hover:bg-border text-charcoal transition-colors"
              >
                <RotateCcw size={12} />
                {confirmAction === 'reservations' ? '한 번 더 누르면 예약 초기화' : '예약 초기화'}
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'setup') {
                    saveUndoSnapshot('설정 초기화')
                    resetSetup()
                    toast.show(toastMessages.settingsReset, 'info', toastActions.undo(() => undo()))
                    setConfirmAction(null)
                    setIsSettingsOpen(false)
                    return
                  }
                  setConfirmAction('setup')
                }}
                className="w-full inline-flex items-center gap-1.5 text-[12px] font-semibold px-2 py-1.5 rounded-lg bg-occupied-light hover:bg-occupied/20 text-occupied transition-colors"
              >
                <Trash2 size={12} />
                {confirmAction === 'setup' ? '한 번 더 누르면 설정 초기화' : '설정 초기화'}
              </button>
              {platform !== 'android' && (
              <button
                onClick={handleQuitApp}
                className="w-full inline-flex items-center gap-1.5 text-[12px] font-semibold px-2 py-1.5 rounded-lg bg-charcoal/10 hover:bg-charcoal/20 text-charcoal transition-colors"
              >
                <LogOut size={12} />
                앱 나가기
              </button>
              )}
              </div>
            </div>
          )}
        </div>

        {onToggleTimeTable && !isMobile && (
          <button
            onClick={onToggleTimeTable}
            className={cn(
              'inline-flex items-center justify-center rounded-lg transition-all duration-150',
              isMobile ? 'w-10 h-10' : 'w-7 h-7',
              showTimeTable
                ? 'bg-primary/10 text-primary'
                : 'text-charcoal-lighter hover:text-charcoal-light hover:bg-cream'
            )}
            title="타임테이블"
          >
            <Clock size={isMobile ? 16 : 12} />
          </button>
        )}
      </div>
    </div>
  )
}
