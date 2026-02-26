import { useMemo } from 'react'
import { Users, Sun, Moon, Clock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { SNAP_SIZE } from '@/data/dummy'
import { canvasRectStyle, floorGridStyle } from '@/features/floor-map/floorMapStyles'
import { useElementSize } from '@/hooks/useElementSize'
import EditableTable from './EditableTable'
import DroppableTable from './DroppableTable'

interface FloorMapProps {
  showTimeTable?: boolean
  onToggleTimeTable?: () => void
}

export default function FloorMap({ showTimeTable, onToggleTimeTable }: FloorMapProps) {
  const store = useReservationStore()
  const { tables: baseTables, reservations, isEditMode, selectTable, setFocusedTable, activeSession, setActiveSession } = store
  const { ref: viewportRef, size: viewportSize } = useElementSize<HTMLDivElement>()

  // Edit mode: physical base tables; operation mode: session-effective tables
  const tables = isEditMode ? baseTables : store.getEffectiveTables()

  const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0)
  const occupiedSeats = tables
    .filter((t) => {
      if (t.status !== 'occupied' || !t.currentTeam) return false
      if (!t.currentTeam.reservationId) return true // walk-in
      const res = reservations.find((r) => r.id === t.currentTeam!.reservationId)
      return !res || res.period === activeSession
    })
    .reduce((sum, t) => sum + t.seats, 0)

  const canvasSize = useMemo(() => {
    if (tables.length === 0) return { width: 400, height: 400 }
    const maxX = Math.max(...tables.map((t) => t.x + t.width))
    const maxY = Math.max(...tables.map((t) => t.y + t.height))
    return {
      width: Math.max(400, maxX),
      height: Math.max(400, maxY),
    }
  }, [tables])
  const shouldCenterCanvas =
    viewportSize.width > 0 &&
    viewportSize.height > 0 &&
    canvasSize.width + 32 <= viewportSize.width &&
    canvasSize.height + 32 <= viewportSize.height

  const handleCanvasClick = () => {
    if (isEditMode) {
      selectTable(null)
    } else {
      setFocusedTable(null)
    }
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-cream min-w-0">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface/60 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-primary" />
            <span className="text-xs font-semibold text-charcoal">{occupiedSeats}</span>
            <span className="text-xs text-charcoal-lighter">/</span>
            <span className="text-xs text-charcoal-light">{totalSeats}</span>
            <span className="text-[10px] text-charcoal-lighter">좌석</span>
          </div>

          {!isEditMode && (
            <div className="flex items-center gap-2 text-[11px] ml-1">
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

          {isEditMode && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              편집 모드
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onToggleTimeTable && (
            <button
              onClick={onToggleTimeTable}
              className={cn(
                'inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150',
                showTimeTable
                  ? 'bg-primary/10 text-primary'
                  : 'text-charcoal-lighter hover:text-charcoal-light hover:bg-cream'
              )}
              title="타임테이블"
            >
              <Clock size={12} />
            </button>
          )}
          <div className="flex items-center gap-1 bg-cream rounded-lg p-0.5">
            <button
              onClick={() => setActiveSession('lunch')}
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-all duration-150',
                activeSession === 'lunch'
                  ? 'bg-surface text-charcoal shadow-sm'
                  : 'text-charcoal-lighter hover:text-charcoal-light'
              )}
            >
              <Sun size={11} />
              점심
            </button>
            <button
              onClick={() => setActiveSession('dinner')}
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-all duration-150',
                activeSession === 'dinner'
                  ? 'bg-surface text-charcoal shadow-sm'
                  : 'text-charcoal-lighter hover:text-charcoal-light'
              )}
            >
              <Moon size={11} />
              저녁
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div ref={viewportRef} className="flex-1 relative overflow-auto">
        <div className={cn(
          'w-full h-full min-w-full min-h-full grid p-4',
          shouldCenterCanvas ? 'place-items-center' : 'place-items-start'
        )}>
          <div
            onClick={handleCanvasClick}
            className={cn(
              'relative',
              isEditMode ? 'bg-surface' : 'bg-surface/50'
            )}
            style={canvasRectStyle(canvasSize)}
          >
          <div
            className={cn(
              'absolute inset-0 pointer-events-none',
              isEditMode ? 'opacity-90' : 'opacity-100'
            )}
            style={floorGridStyle(SNAP_SIZE, isEditMode ? 'edit' : 'view')}
          />

            {tables.map((table) =>
              isEditMode ? (
                <EditableTable key={table.id} table={table} />
              ) : (
                <DroppableTable key={table.id} table={table} />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
