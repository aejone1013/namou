import { useState, useMemo } from 'react'
import { MapPin, Check, Clock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { SNAP_SIZE } from '@/data/dummy'
import EditableTable from './EditableTable'
import DroppableTable from './DroppableTable'
import TableEditPanel from './TableEditPanel'
import FunctionMenu from './FunctionMenu'

const MAP_PADDING = 80
const MIN_MAP_WIDTH = 500
const MIN_MAP_HEIGHT = 400

// 시간대 목록 생성 (11:00 ~ 22:30)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 11
  const min = i % 2 === 0 ? '00' : '30'
  if (hour > 22) return null
  return `${hour}:${min}`
}).filter(Boolean) as string[]

export default function FloorMap() {
  const {
    tables,
    reservations,
    isEditMode,
    toggleEditMode,
    selectTable,
    timeFilter,
    setTimeFilter,
  } = useReservationStore()

  const [showTimeFilter, setShowTimeFilter] = useState(false)

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

  // 시간대 필터에 해당하는 예약 수
  const filteredReservationCount = timeFilter
    ? reservations.filter((r) => r.time === timeFilter && r.status !== 'completed').length
    : 0

  // 캔버스 크기를 테이블 위치에 맞게 자동 계산
  const canvasSize = useMemo(() => {
    if (tables.length === 0) {
      return { width: MIN_MAP_WIDTH, height: MIN_MAP_HEIGHT }
    }
    const maxRight = Math.max(...tables.map((t) => t.x + t.width))
    const maxBottom = Math.max(...tables.map((t) => t.y + t.height))

    return {
      width: Math.max(MIN_MAP_WIDTH, maxRight + MAP_PADDING),
      height: Math.max(MIN_MAP_HEIGHT, maxBottom + MAP_PADDING),
    }
  }, [tables])

  // 편집 모드에서 빈 공간 클릭 시 선택 해제
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

        <div className="flex items-center gap-3">
          {!isEditMode && (
            <>
              <div className="flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-available" />
                  비어있음 ({availableCount})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-occupied" />
                  사용중 ({occupiedCount})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-reserved" />
                  예약됨 ({reservedCount})
                </span>
              </div>

              {/* 시간대 필터 토글 버튼 */}
              <button
                onClick={() => setShowTimeFilter(!showTimeFilter)}
                className={cn(
                  'inline-flex items-center gap-1.5',
                  'text-xs font-medium px-3 py-1.5 rounded-xl',
                  'transition-colors',
                  showTimeFilter || timeFilter
                    ? 'bg-primary text-white'
                    : 'bg-cream text-charcoal-light border border-border hover:bg-border'
                )}
              >
                <Clock size={14} />
                {timeFilter ? timeFilter : '시간대'}
              </button>
            </>
          )}

          {isEditMode && (
            <button
              onClick={toggleEditMode}
              className={cn(
                'inline-flex items-center gap-1.5',
                'text-xs font-medium px-3 py-1.5 rounded-xl',
                'transition-colors',
                'bg-primary text-white hover:bg-primary-dark'
              )}
            >
              <Check size={14} />
              편집 완료
            </button>
          )}

          {/* 기능 메뉴 */}
          <FunctionMenu />
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-auto p-6">
        <div className="flex gap-4">
          {/* 테이블 맵 */}
          <div
            onClick={handleCanvasClick}
            className={cn(
              'relative bg-surface rounded-3xl border shadow-sm shrink-0',
              isEditMode ? 'border-primary/20 border-dashed' : 'border-border'
            )}
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            {/* Grid dots pattern */}
            <div
              className="absolute inset-0 rounded-3xl opacity-[0.15]"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #c4b8a8 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Tables - 모드에 따라 다른 컴포넌트 렌더링 */}
            {tables.map((table) =>
              isEditMode ? (
                <EditableTable key={table.id} table={table} />
              ) : (
                <DroppableTable key={table.id} table={table} />
              )
            )}
          </div>

          {/* 시간대 필터 패널 - 맵 우측에 표시 */}
          {showTimeFilter && !isEditMode && (
            <div className="w-[140px] shrink-0 bg-surface rounded-2xl border border-border shadow-sm overflow-hidden self-start">
              <div className="px-3 py-2.5 border-b border-border bg-cream/50">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-charcoal">시간대 필터</p>
                  {timeFilter && (
                    <button
                      onClick={() => setTimeFilter(null)}
                      className="text-[10px] text-primary hover:text-primary-dark"
                    >
                      해제
                    </button>
                  )}
                </div>
                {timeFilter && (
                  <p className="text-[10px] text-charcoal-lighter mt-0.5">
                    {filteredReservationCount}건의 예약
                  </p>
                )}
              </div>
              <div className="p-2 max-h-[500px] overflow-y-auto space-y-0.5">
                {TIME_SLOTS.map((slot) => {
                  const count = reservations.filter(
                    (r) => r.time === slot && r.status !== 'completed'
                  ).length
                  return (
                    <button
                      key={slot}
                      onClick={() => setTimeFilter(timeFilter === slot ? null : slot)}
                      className={cn(
                        'w-full flex items-center justify-between',
                        'text-xs px-2.5 py-1.5 rounded-lg',
                        'transition-colors',
                        timeFilter === slot
                          ? 'bg-primary text-white font-medium'
                          : count > 0
                            ? 'bg-cream hover:bg-primary/10 text-charcoal font-medium'
                            : 'text-charcoal-lighter hover:bg-cream'
                      )}
                    >
                      <span>{slot}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            'text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full',
                            timeFilter === slot
                              ? 'bg-white/20 text-white'
                              : 'bg-primary/10 text-primary'
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 편집 모드 패널 */}
          {isEditMode && <TableEditPanel />}
        </div>
      </div>
    </div>
  )
}
