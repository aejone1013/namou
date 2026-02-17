import { MapPin, Pencil, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import EditableTable from './EditableTable'
import DroppableTable from './DroppableTable'
import TableEditPanel from './TableEditPanel'

export default function FloorMap() {
  const { tables, isEditMode, toggleEditMode, selectTable, selectedTableIds } = useReservationStore()

  const availableCount = tables.filter((t) => t.status === 'available').length
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length
  const reservedCount = tables.filter((t) => t.status === 'reserved').length

  // 편집 모드에서 빈 공간 클릭 시 선택 해제
  const handleCanvasClick = () => {
    if (isEditMode) {
      selectTable(null)
    }
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-cream">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-surface/60 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-charcoal">플로어 맵</h2>
          {isEditMode && (
            <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              편집 모드
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!isEditMode && (
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
          )}

          <button
            onClick={toggleEditMode}
            className={cn(
              'inline-flex items-center gap-1.5',
              'text-xs font-medium px-3 py-1.5 rounded-xl',
              'transition-colors',
              isEditMode
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-cream text-charcoal-light border border-border hover:bg-border'
            )}
          >
            {isEditMode ? (
              <>
                <Check size={14} />
                편집 완료
              </>
            ) : (
              <>
                <Pencil size={14} />
                배치 편집
              </>
            )}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-auto p-6">
        <div
          onClick={handleCanvasClick}
          className={cn(
            'relative bg-surface rounded-3xl border shadow-sm',
            isEditMode ? 'border-primary/20 border-dashed' : 'border-border'
          )}
          style={{ width: 700, height: 900 }}
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

        {/* 편집 모드 패널 */}
        {isEditMode && <TableEditPanel />}
      </div>
    </div>
  )
}
