import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { List, Map, SlidersHorizontal, Clock } from 'lucide-react'
import { cn } from './lib/cn'
import { useMobileLayout } from './hooks/useMobileLayout'
import { useViewportHeightVar } from './hooks/useViewportHeight'
import Sidebar from './components/Sidebar'
import FloorMap from './components/FloorMap'
import ControlPanel from './components/ControlPanel'
import TimeTable from './components/TimeTable'
import MapTopBar from './components/MapTopBar'
import NewReservationModal from './components/NewReservationModal'
import ToastContainer from './components/Toast'
import { useReservationStore } from './store/useReservationStore'

type MobileTab = 'reservations' | 'map' | 'control' | 'timetable'

export default function App() {
  void useReservationStore()
  useViewportHeightVar()
  const isMobile = useMobileLayout()
  const [showTimeTable, setShowTimeTable] = useState(true)
  const [mobileTab, setMobileTab] = useState<MobileTab>('map')
  const { focusedTableId } = useReservationStore()

  // 모바일: 테이블 선택 시 자동으로 컨트롤 패널로 전환
  const effectiveMobileTab = isMobile && focusedTableId && mobileTab === 'map' ? 'control' : mobileTab

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let isDisposed = false
    const hideSplash = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (isDisposed) return
          const plugins = (window as Window & {
            Capacitor?: {
              Plugins?: {
                SplashScreen?: { hide?: () => Promise<void> }
              }
            }
          }).Capacitor?.Plugins
          void plugins?.SplashScreen?.hide?.()
        })
      })
    }

    if ('fonts' in document && document.fonts?.ready) {
      void document.fonts.ready.then(hideSplash).catch(hideSplash)
    } else {
      hideSplash()
    }

    return () => {
      isDisposed = true
    }
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let removeListener: (() => void) | undefined

    void import('@capacitor/app').then(({ App: CapApp }) => {
      void CapApp.addListener('backButton', ({ canGoBack }) => {
        const store = useReservationStore.getState()

        if (store.isModalOpen) {
          store.closeModal()
          return
        }

        window.dispatchEvent(new CustomEvent('namou:request-close-transient-ui'))

        if (store.focusedTableId) {
          store.setFocusedTable(null)
          return
        }

        if (isMobile && mobileTab !== 'map') {
          setMobileTab('map')
          return
        }

        if (canGoBack) {
          window.history.back()
          return
        }

        void CapApp.minimizeApp()
      }).then((handle) => {
        removeListener = () => {
          void handle.remove()
        }
      })
    })

    return () => {
      removeListener?.()
    }
  }, [isMobile, mobileTab])

  if (isMobile) {
    return (
      <div
        className="flex flex-col w-screen bg-cream overflow-hidden"
        style={{ height: 'calc(var(--app-height, 1vh) * 100)' }}
      >
        {/* Top bar */}
        <MapTopBar
          showTimeTable={effectiveMobileTab === 'timetable'}
          onToggleTimeTable={() =>
            setMobileTab((v) => (v === 'timetable' ? 'map' : 'timetable'))
          }
        />

        {/* Main content area */}
        <div className="flex-1 min-h-0 relative">
          <div className={cn('absolute inset-0', effectiveMobileTab !== 'reservations' && 'hidden')}>
            <Sidebar />
          </div>
          <div className={cn('absolute inset-0', effectiveMobileTab !== 'map' && 'hidden')}>
            <FloorMap />
          </div>
          <div className={cn('absolute inset-0', effectiveMobileTab !== 'control' && 'hidden')}>
            <ControlPanel />
          </div>
          <div className={cn('absolute inset-0', effectiveMobileTab !== 'timetable' && 'hidden')}>
            <TimeTable onClose={() => setMobileTab('map')} />
          </div>
        </div>

        {/* Bottom tab navigation */}
        <nav className="flex items-center justify-around bg-surface border-t border-border safe-area-bottom">
          {([
            { key: 'reservations' as const, icon: List, label: '예약' },
            { key: 'map' as const, icon: Map, label: '배치도' },
            { key: 'control' as const, icon: SlidersHorizontal, label: '상세' },
            { key: 'timetable' as const, icon: Clock, label: '타임' },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setMobileTab(key)}
              className={cn(
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 px-2 text-[11px] font-semibold transition-colors',
                effectiveMobileTab === key
                  ? 'text-primary'
                  : 'text-charcoal-lighter'
              )}
            >
              <Icon size={21} />
              {label}
            </button>
          ))}
        </nav>

        <NewReservationModal />
        <ToastContainer />
      </div>
    )
  }

  // Desktop layout (기존)
  return (
    <div className="flex h-screen w-screen bg-cream">
      <Sidebar />
      <div className="flex-1 min-w-0 h-full flex flex-col">
        <MapTopBar
          showTimeTable={showTimeTable}
          onToggleTimeTable={() => setShowTimeTable((v) => !v)}
        />
        <div className="flex-1 min-h-0 flex">
          <FloorMap />
          <ControlPanel />
        </div>
      </div>
      {showTimeTable && <TimeTable onClose={() => setShowTimeTable(false)} />}
      <NewReservationModal />

      <ToastContainer />
    </div>
  )
}
