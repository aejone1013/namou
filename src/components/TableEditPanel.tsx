import { Circle, RectangleHorizontal, Trash2, Plus, Users, Tag } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'

export default function TableEditPanel() {
  const {
    tables,
    selectedTableId,
    selectTable,
    updateTable,
    addTable,
    removeTable,
  } = useReservationStore()

  const selectedTable = tables.find((t) => t.id === selectedTableId)

  return (
    <div className="absolute top-4 right-4 w-[220px] bg-surface rounded-2xl border border-border shadow-lg z-30 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-border bg-cream/50">
        <p className="text-xs font-semibold text-charcoal">테이블 편집</p>
      </div>

      {/* 테이블 추가 버튼 */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[11px] text-charcoal-lighter mb-2">테이블 추가</p>
        <div className="flex gap-2">
          <button
            onClick={() => addTable('circle')}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5',
              'text-xs font-medium py-2 rounded-xl',
              'bg-cream hover:bg-border text-charcoal-light',
              'transition-colors border border-border'
            )}
          >
            <Circle size={14} />
            원형
          </button>
          <button
            onClick={() => addTable('rectangle')}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5',
              'text-xs font-medium py-2 rounded-xl',
              'bg-cream hover:bg-border text-charcoal-light',
              'transition-colors border border-border'
            )}
          >
            <RectangleHorizontal size={14} />
            사각형
          </button>
        </div>
      </div>

      {/* 선택된 테이블 속성 */}
      {selectedTable ? (
        <div className="px-4 py-3 space-y-3">
          <p className="text-[11px] text-charcoal-lighter">선택된 테이블</p>

          {/* 라벨 */}
          <div>
            <label className="flex items-center gap-1 text-[11px] text-charcoal-light mb-1">
              <Tag size={11} /> 이름
            </label>
            <input
              type="text"
              value={selectedTable.label}
              onChange={(e) =>
                updateTable(selectedTable.id, { label: e.target.value })
              }
              className={cn(
                'w-full px-3 py-1.5 text-sm rounded-xl',
                'bg-cream border border-border text-charcoal',
                'focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10'
              )}
            />
          </div>

          {/* 좌석 수 */}
          <div>
            <label className="flex items-center gap-1 text-[11px] text-charcoal-light mb-1">
              <Users size={11} /> 좌석 수
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={selectedTable.seats}
              onChange={(e) =>
                updateTable(selectedTable.id, {
                  seats: Math.max(1, Number(e.target.value)),
                })
              }
              className={cn(
                'w-full px-3 py-1.5 text-sm rounded-xl',
                'bg-cream border border-border text-charcoal',
                'focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10'
              )}
            />
          </div>

          {/* 모양 변경 */}
          <div>
            <label className="text-[11px] text-charcoal-light mb-1 block">모양</label>
            <div className="flex gap-2">
              <button
                onClick={() => updateTable(selectedTable.id, { shape: 'circle' })}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1',
                  'text-[11px] font-medium py-1.5 rounded-xl border',
                  'transition-colors',
                  selectedTable.shape === 'circle'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-cream border-border text-charcoal-lighter hover:bg-border'
                )}
              >
                <Circle size={12} />원
              </button>
              <button
                onClick={() => updateTable(selectedTable.id, { shape: 'rectangle' })}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1',
                  'text-[11px] font-medium py-1.5 rounded-xl border',
                  'transition-colors',
                  selectedTable.shape === 'rectangle'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-cream border-border text-charcoal-lighter hover:bg-border'
                )}
              >
                <RectangleHorizontal size={12} />사각
              </button>
            </div>
          </div>

          {/* 위치 표시 */}
          <div className="text-[10px] text-charcoal-lighter">
            위치: ({selectedTable.x}, {selectedTable.y}) · 크기: {selectedTable.width}×{selectedTable.height}
          </div>

          {/* 삭제 */}
          <button
            onClick={() => removeTable(selectedTable.id)}
            className={cn(
              'w-full inline-flex items-center justify-center gap-1.5',
              'text-xs font-medium py-2 rounded-xl',
              'text-occupied bg-occupied-light hover:bg-occupied/20',
              'transition-colors'
            )}
          >
            <Trash2 size={13} />
            테이블 삭제
          </button>
        </div>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-charcoal-lighter">
            테이블을 클릭하여 선택하세요
          </p>
        </div>
      )}

      {/* 테이블 목록 */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[11px] text-charcoal-lighter mb-2">전체 테이블 ({tables.length})</p>
        <div className="flex flex-wrap gap-1.5">
          {tables.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTable(t.id)}
              className={cn(
                'text-[11px] font-medium px-2 py-1 rounded-lg',
                'transition-colors',
                selectedTableId === t.id
                  ? 'bg-primary text-white'
                  : 'bg-cream text-charcoal-light hover:bg-border'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
