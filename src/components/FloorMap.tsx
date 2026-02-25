import { useMemo } from 'react'
import { Users, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { SNAP_SIZE } from '@/data/dummy'
import EditableTable from './EditableTable'
import DroppableTable from './DroppableTable'

export default function FloorMap() {
  const { tables, reservations, isEditMode, selectTable, setFocusedTable, activeSession, setActiveSession } = useReservationStore()

  const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0)
  // Count occupied seats only for current session (walk-ins always count)
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
    const padding = 0
    return {
      width: Math.max(400, maxX + padding),
      height: Math.max(400, maxY + padding),
    }
  }, [tables])

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

      {/* Canvas Area — no padding for edge-to-edge */}
      <div className="flex-1 relative overflow-auto">
        <div
          onClick={handleCanvasClick}
          className={cn(
            'relative min-h-full',
            isEditMode ? 'bg-surface' : 'bg-surface/50'
          )}
          style={{ width: canvasSize.width, height: canvasSize.height }}
        >
          {/* Grid dots */}
          {isEditMode && (
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage: 'radial-gradient(circle, #b5a899 1px, transparent 1px)',
                backgroundSize: `${SNAP_SIZE * 2}px ${SNAP_SIZE * 2}px`,
              }}
            />
          )}

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
  )
}
