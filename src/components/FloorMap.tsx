import { useMemo } from 'react'
import { Pencil, Check, Users, Clock, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { SNAP_SIZE } from '@/data/dummy'
import EditableTable from './EditableTable'
import DroppableTable from './DroppableTable'
import TableEditPanel from './TableEditPanel'

interface FloorMapProps {
  onOpenTimeTable: () => void
}

export default function FloorMap({ onOpenTimeTable }: FloorMapProps) {
  const { tables, isEditMode, toggleEditMode, selectTable, resetSetup } = useReservationStore()

  const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0)
  const occupiedSeats = tables
    .filter((t) => t.status === 'occupied')
    .reduce((sum, t) => sum + t.seats, 0)

  // 테이블 배치에 맞춰 맵 크기 자동 계산
  const canvasSize = useMemo(() => {
    if (tables.length === 0) return { width: 400, height: 400 }
    const maxX = Math.max(...tables.map((t) => t.x + t.width))
    const maxY = Math.max(...tables.map((t) => t.y + t.height))
    const padding = 80
    return {
      width: Math.max(400, maxX + padding),
      height: Math.max(400, maxY + padding),
    }
  }, [tables])

  const handleCanvasClick = () => {
    if (isEditMode) {
      selectTable(null)
    }
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-cream">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-surface/60 backdrop-blur-sm border-b border-border">
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
            <>
              <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                편집 모드
              </span>
              <button
                onClick={() => {
                  if (window.confirm('테이블 배치를 초기화하시겠습니까? 모든 예약과 배치가 삭제됩니다.')) {
                    resetSetup()
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-1',
                  'text-[10px] font-medium px-2 py-0.5 rounded-full',
                  'text-occupied bg-occupied-light hover:bg-occupied/20',
                  'transition-colors'
                )}
              >
                <RotateCcw size={10} />
                초기화
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 예약시간대 버튼 */}
          {!isEditMode && (
            <button
              onClick={onOpenTimeTable}
              className={cn(
                'inline-flex items-center gap-1',
                'text-[11px] font-medium px-2.5 py-1 rounded-lg',
                'bg-cream text-charcoal-light border border-border hover:bg-border',
                'transition-colors'
              )}
            >
              <Clock size={12} />
              예약시간대
            </button>
          )}

          <button
            onClick={toggleEditMode}
            className={cn(
              'inline-flex items-center gap-1',
              'text-[11px] font-medium px-2.5 py-1 rounded-lg',
              'transition-colors',
              isEditMode
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-cream text-charcoal-light border border-border hover:bg-border'
            )}
          >
            {isEditMode ? (
              <><Check size={12} /> 편집 완료</>
            ) : (
              <><Pencil size={12} /> 배치 편집</>
            )}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-auto p-4">
        <div
          onClick={handleCanvasClick}
          className={cn(
            'relative bg-surface rounded-2xl border shadow-sm',
            isEditMode ? 'border-primary/20 border-dashed' : 'border-border'
          )}
          style={{ width: canvasSize.width, height: canvasSize.height }}
        >
          {/* Grid dots */}
          <div
            className="absolute inset-0 rounded-2xl opacity-[0.12]"
            style={{
              backgroundImage: 'radial-gradient(circle, #b5a899 1px, transparent 1px)',
              backgroundSize: `${SNAP_SIZE * 2}px ${SNAP_SIZE * 2}px`,
            }}
          />

          {tables.map((table) =>
            isEditMode ? (
              <EditableTable key={table.id} table={table} />
            ) : (
              <DroppableTable key={table.id} table={table} />
            )
          )}
        </div>

        {isEditMode && <TableEditPanel />}
      </div>
    </div>
  )
}
