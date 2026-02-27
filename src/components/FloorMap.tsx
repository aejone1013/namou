import { useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { SNAP_SIZE, getTableNumber } from '@/data/dummy'
import { canvasRectStyle, floorGridStyle } from '@/features/floor-map/floorMapStyles'
import { useElementSize } from '@/hooks/useElementSize'
import EditableTable from './EditableTable'
import DroppableTable from './DroppableTable'

interface FloorMapProps {
  className?: string
}

export default function FloorMap({ className }: FloorMapProps) {
  const MAP_CANVAS_PADDING = 16
  const store = useReservationStore()
  const { tables: baseTables, isEditMode, selectTable, setFocusedTable, activeSession } = store
  const { ref: viewportRef, size: viewportSize } = useElementSize<HTMLDivElement>()

  // Edit mode: physical base tables; operation mode: session-effective tables
  const tables = isEditMode ? baseTables : store.getEffectiveTables()

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
    canvasSize.width + MAP_CANVAS_PADDING * 2 <= viewportSize.width &&
    canvasSize.height + MAP_CANVAS_PADDING * 2 <= viewportSize.height

  const plannedMergeOutlines = useMemo(() => {
    if (isEditMode) return []
    const byNum = new Map(tables.map((t) => [getTableNumber(t.label), t] as const))
    const byId = new Map(tables.map((t) => [t.id, t] as const))

    const outlines: Array<{ key: string; left: number; top: number; width: number; height: number; label: string }> = []
    const seenOutlineKeys = new Set<string>()
    for (const t of tables) {
      if (!t.nextBooking) continue
      const label = t.nextBooking?.targetLabel
      const scopeIds = t.nextBooking?.scopeTableIds ?? []
      let rangeTables: Array<(typeof tables)[number]> = []
      if (scopeIds.length >= 2) {
        rangeTables = scopeIds.map((id) => byId.get(id)).filter(Boolean) as Array<(typeof tables)[number]>
      } else if (label && /[+\-~]/.test(label)) {
        let nums: number[] = []
        const pairOrRangeMatch = label.match(/^T(\d+)(?:[+\-~]T?)(\d+)$/)
        if (pairOrRangeMatch) {
          const start = parseInt(pairOrRangeMatch[1], 10)
          const end = parseInt(pairOrRangeMatch[2], 10)
          if (Math.abs(end - start) === 1 && label.includes('+')) {
            nums = [start, end]
          } else {
            const min = Math.min(start, end)
            const max = Math.max(start, end)
            nums = Array.from({ length: max - min + 1 }, (_, i) => min + i)
          }
        }
        rangeTables = nums.map((num) => byNum.get(num)).filter(Boolean) as Array<(typeof tables)[number]>
      }
      if (rangeTables.length < 2) continue

      const dedupeKey = `${t.nextBooking.reservationId}:${scopeIds.length > 0 ? [...scopeIds].sort().join(',') : (label ?? '')}`
      if (seenOutlineKeys.has(dedupeKey)) continue
      seenOutlineKeys.add(dedupeKey)

      const left = Math.min(...rangeTables.map((rt) => rt!.x))
      const top = Math.min(...rangeTables.map((rt) => rt!.y))
      const right = Math.max(...rangeTables.map((rt) => rt!.x + rt!.width))
      const bottom = Math.max(...rangeTables.map((rt) => rt!.y + rt!.height))
      outlines.push({
        key: dedupeKey,
        left: left - 3,
        top: top - 3,
        width: right - left + 6,
        height: bottom - top + 6,
        label: label ?? `${rangeTables[0].label}-${rangeTables[rangeTables.length - 1].label.replace('T','')}`,
      })
    }
    return outlines
  }, [tables, isEditMode])

  const handleCanvasClick = () => {
    if (isEditMode) {
      selectTable(null)
    } else {
      setFocusedTable(null)
    }
  }

  return (
    <div className={cn('flex-1 h-full min-w-0', className)}>
      <div
        ref={viewportRef}
        className={cn(
          'h-full relative overflow-auto',
          activeSession === 'lunch' ? 'bg-[#f8f5ee]' : 'bg-[#f1ebe0]'
        )}
      >
        <div className={cn(
          'w-full h-full min-w-full min-h-full grid',
          shouldCenterCanvas ? 'place-items-center' : 'place-items-start'
        )}>
          <div
            onClick={handleCanvasClick}
            className="relative"
            style={{
              ...canvasRectStyle({
                width: canvasSize.width + MAP_CANVAS_PADDING * 2,
                height: canvasSize.height + MAP_CANVAS_PADDING * 2,
              }),
              padding: MAP_CANVAS_PADDING,
              boxSizing: 'border-box',
            }}
          >
            <div
              className="relative"
              style={canvasRectStyle(canvasSize)}
            >
              <div
                className={cn(
                  'absolute inset-0 pointer-events-none',
                  isEditMode ? 'opacity-90' : 'opacity-100'
                )}
                style={floorGridStyle(SNAP_SIZE, isEditMode ? 'edit' : 'view')}
              />

              {plannedMergeOutlines.map((outline) => (
                <div
                  key={outline.key}
                  className="absolute pointer-events-none rounded-[10px] border border-reserved/35 bg-reserved/[0.03] shadow-[0_1px_3px_rgba(90,58,30,0.06)]"
                  style={{
                    left: outline.left,
                    top: outline.top,
                    width: outline.width,
                    height: outline.height,
                    zIndex: 14,
                  }}
                  title={`병합 예정 범위 (${outline.label})`}
                >
                  <div
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-reserved rounded-full flex items-center justify-center shadow-sm ring-2 ring-surface"
                    style={{ zIndex: 30 }}
                  >
                    <CalendarClock size={8} className="text-white" />
                  </div>
                </div>
              ))}

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
    </div>
  )
}
