import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, ScanSearch, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { SNAP_SIZE, getTableNumber } from '@/data/dummy'
import { canvasRectStyle, floorGridStyle } from '@/features/floor-map/floorMapStyles'
import { useElementSize } from '@/hooks/useElementSize'
import { useMobileLayout } from '@/hooks/useMobileLayout'
import EditableTable from './EditableTable'
import DroppableTable from './DroppableTable'

interface FloorMapProps {
  className?: string
}

export default function FloorMap({ className }: FloorMapProps) {
  const MAP_CANVAS_PADDING = 16
  const MIN_ZOOM = 0.75
  const MAX_ZOOM = 2.5
  const store = useReservationStore()
  const { tables: baseTables, isEditMode, selectTable, setFocusedTable, activeSession } = store
  const { ref: viewportRef, size: viewportSize } = useElementSize<HTMLDivElement>()
  const isMobile = useMobileLayout()
  const pinchStartDistanceRef = useRef<number | null>(null)
  const pinchStartZoomRef = useRef(1)
  const zoomRef = useRef(1)
  const [zoom, setZoom] = useState(1)
  const [didAutoFit, setDidAutoFit] = useState(false)

  // Edit mode: physical base tables; operation mode: session-effective tables
  const tables = isEditMode ? baseTables : store.getEffectiveTables()
  const clampZoom = useCallback((value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)), [MAX_ZOOM, MIN_ZOOM])

  const canvasSize = useMemo(() => {
    if (tables.length === 0) return { width: 400, height: 400 }
    const maxX = Math.max(...tables.map((t) => t.x + t.width))
    const maxY = Math.max(...tables.map((t) => t.y + t.height))
    return {
      width: Math.max(400, maxX),
      height: Math.max(400, maxY),
    }
  }, [tables])
  const totalCanvasWidth = canvasSize.width + MAP_CANVAS_PADDING * 2
  const totalCanvasHeight = canvasSize.height + MAP_CANVAS_PADDING * 2
  const scaledCanvasWidth = totalCanvasWidth * zoom
  const scaledCanvasHeight = totalCanvasHeight * zoom
  const shouldCenterCanvas =
    viewportSize.width > 0 &&
    viewportSize.height > 0 &&
    scaledCanvasWidth <= viewportSize.width &&
    scaledCanvasHeight <= viewportSize.height

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  const fitCanvasToViewport = useCallback((maxZoom?: number) => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return
    const fitted = Math.min(viewportSize.width / totalCanvasWidth, viewportSize.height / totalCanvasHeight)
    const nextZoom = clampZoom(maxZoom ? Math.min(fitted, maxZoom) : fitted)
    setZoom(nextZoom)

    const viewport = viewportRef.current
    if (!viewport) return
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, (totalCanvasWidth * nextZoom - viewport.clientWidth) / 2)
      viewport.scrollTop = Math.max(0, (totalCanvasHeight * nextZoom - viewport.clientHeight) / 2)
    })
  }, [clampZoom, totalCanvasHeight, totalCanvasWidth, viewportRef, viewportSize.height, viewportSize.width])

  useEffect(() => {
    if (!isMobile || didAutoFit || viewportSize.width <= 0 || viewportSize.height <= 0) return
    fitCanvasToViewport(1.15)
    setDidAutoFit(true)
  }, [didAutoFit, fitCanvasToViewport, isMobile, viewportSize.height, viewportSize.width])

  const setZoomAroundViewportCenter = useCallback((nextZoom: number) => {
    const viewport = viewportRef.current
    if (!viewport) {
      setZoom(clampZoom(nextZoom))
      return
    }

    const clampedZoom = clampZoom(nextZoom)
    const viewportCenterX = viewport.scrollLeft + viewport.clientWidth / 2
    const viewportCenterY = viewport.scrollTop + viewport.clientHeight / 2
    const contentCenterX = viewportCenterX / zoomRef.current
    const contentCenterY = viewportCenterY / zoomRef.current

    setZoom(clampedZoom)
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, contentCenterX * clampedZoom - viewport.clientWidth / 2)
      viewport.scrollTop = Math.max(0, contentCenterY * clampedZoom - viewport.clientHeight / 2)
    })
  }, [clampZoom, viewportRef])

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const [a, b] = [touches[0], touches[1]]
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2) return
    pinchStartDistanceRef.current = getTouchDistance(e.touches)
    pinchStartZoomRef.current = zoomRef.current
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2 || !pinchStartDistanceRef.current) return
    if (e.cancelable) e.preventDefault()

    const viewport = viewportRef.current
    if (!viewport) return

    const nextDistance = getTouchDistance(e.touches)
    const nextZoom = clampZoom(pinchStartZoomRef.current * (nextDistance / pinchStartDistanceRef.current))
    const touchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2
    const touchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2
    const rect = viewport.getBoundingClientRect()
    const anchorX = (viewport.scrollLeft + touchCenterX - rect.left) / zoomRef.current
    const anchorY = (viewport.scrollTop + touchCenterY - rect.top) / zoomRef.current

    setZoom(nextZoom)
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, anchorX * nextZoom - (touchCenterX - rect.left))
      viewport.scrollTop = Math.max(0, anchorY * nextZoom - (touchCenterY - rect.top))
    })
  }

  const handleTouchEnd = () => {
    if (pinchStartDistanceRef.current === null) return
    pinchStartDistanceRef.current = null
    pinchStartZoomRef.current = zoomRef.current
  }

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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
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
                width: scaledCanvasWidth,
                height: scaledCanvasHeight,
              }),
              boxSizing: 'border-box',
            }}
          >
            <div
              className="absolute left-0 top-0"
              style={{
                ...canvasRectStyle({
                  width: totalCanvasWidth,
                  height: totalCanvasHeight,
                }),
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <div
                className={cn(
                  'absolute inset-0 pointer-events-none',
                  isEditMode ? 'opacity-90' : 'opacity-100'
                )}
                style={floorGridStyle(SNAP_SIZE, isEditMode ? 'edit' : 'view')}
              />

              <div
                className="absolute"
                style={{
                  left: MAP_CANVAS_PADDING,
                  top: MAP_CANVAS_PADDING,
                  width: canvasSize.width,
                  height: canvasSize.height,
                }}
              >
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

        <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-2 safe-area-bottom">
          <button
            type="button"
            onClick={() => fitCanvasToViewport(isMobile ? 1.15 : undefined)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface/95 text-charcoal shadow-md backdrop-blur-sm"
            title="화면에 맞추기"
          >
            <ScanSearch size={18} />
          </button>
          <button
            type="button"
            onClick={() => setZoomAroundViewportCenter(zoomRef.current - 0.2)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface/95 text-charcoal shadow-md backdrop-blur-sm"
            title="축소"
          >
            <ZoomOut size={18} />
          </button>
          <button
            type="button"
            onClick={() => setZoomAroundViewportCenter(zoomRef.current + 0.2)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface/95 text-charcoal shadow-md backdrop-blur-sm"
            title="확대"
          >
            <ZoomIn size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
