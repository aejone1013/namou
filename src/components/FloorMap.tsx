import { Pencil, Check, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import EditableTable from './EditableTable'
import DroppableTable from './DroppableTable'
import TableEditPanel from './TableEditPanel'

export default function FloorMap() {
  const { tables, isEditMode, toggleEditMode, selectTable } = useReservationStore()

  const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0)
  const occupiedSeats = tables
    .filter((t) => t.status === 'occupied')
    .reduce((sum, t) => sum + t.seats, 0)

  // 편집 모드에서 빈 공간 클릭 시 선택 해제
  const handleCanvasClick = () => {
    if (isEditMode) {
      selectTable(null)
    }
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-cream">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-surface/60 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-4">
          {/* 좌석 현황 */}
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary" />
            <span className="text-sm font-semibold text-charcoal">
              {occupiedSeats}
            </span>
            <span className="text-sm text-charcoal-lighter">/</span>
            <span className="text-sm text-charcoal-light">{totalSeats}</span>
            <span className="text-xs text-charcoal-lighter">좌석</span>
          </div>

          {!isEditMode && (
            <div className="flex items-center gap-3 text-xs ml-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-available" />
                {tables.filter((t) => t.status === 'available').length}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-occupied" />
                {tables.filter((t) => t.status === 'occupied').length}
              </span>
            </div>
          )}

          {isEditMode && (
            <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              편집 모드
            </span>
          )}
        </div>

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

          {/* Tables */}
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
