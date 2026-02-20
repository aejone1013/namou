import { Trash2, Plus, Users, Tag, Merge, Minus, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'

export default function TableEditPanel() {
  const {
    tables,
    selectedTableIds,
    selectTable,
    toggleSelectTable,
    updateTable,
    addTable,
    removeTable,
    mergeTables,
  } = useReservationStore()

  const selectedTable =
    selectedTableIds.length === 1
      ? tables.find((t) => t.id === selectedTableIds[0])
      : null

  const canMerge = selectedTableIds.length >= 2

  return (
    <div className="absolute top-4 right-4 w-[220px] bg-surface rounded-2xl border border-border shadow-lg z-30 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-border bg-cream/50">
        <p className="text-xs font-semibold text-charcoal">테이블 편집</p>
      </div>

      {/* 테이블 추가 + 병합 버튼 */}
      <div className="px-4 py-3 border-b border-border space-y-2">
        <button
          onClick={() => addTable()}
          className={cn(
            'w-full inline-flex items-center justify-center gap-1.5',
            'text-xs font-medium py-2 rounded-xl',
            'bg-cream hover:bg-border text-charcoal-light',
            'transition-colors border border-border'
          )}
        >
          <Plus size={14} />
          테이블 추가
        </button>

        <button
          onClick={mergeTables}
          disabled={!canMerge}
          className={cn(
            'w-full inline-flex items-center justify-center gap-1.5',
            'text-xs font-medium py-2 rounded-xl',
            'transition-colors border',
            canMerge
              ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
              : 'bg-cream border-border text-charcoal-lighter/50 cursor-not-allowed'
          )}
        >
          <Merge size={14} />
          테이블 병합 {canMerge && `(${selectedTableIds.length}개)`}
        </button>
      </div>

      {/* 선택된 테이블 속성 (단일 선택 시) */}
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

          {/* 좌석 수 - +/- 버튼 방식 */}
          <div>
            <label className="flex items-center gap-1 text-[11px] text-charcoal-light mb-1">
              <Users size={11} /> 좌석 수
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateTable(selectedTable.id, {
                    seats: Math.max(1, selectedTable.seats - 1),
                  })
                }
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-xl',
                  'bg-cream border border-border',
                  'text-charcoal hover:bg-border',
                  'transition-colors active:scale-95'
                )}
              >
                <Minus size={16} />
              </button>
              <span className="flex-1 text-center text-base font-bold text-charcoal">
                {selectedTable.seats}
              </span>
              <button
                onClick={() =>
                  updateTable(selectedTable.id, {
                    seats: Math.min(20, selectedTable.seats + 1),
                  })
                }
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-xl',
                  'bg-cream border border-border',
                  'text-charcoal hover:bg-border',
                  'transition-colors active:scale-95'
                )}
              >
                <Plus size={16} />
              </button>
            </div>
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
      ) : selectedTableIds.length >= 2 ? (
        <div className="px-4 py-4 text-center space-y-2">
          <p className="text-xs font-medium text-primary">
            {selectedTableIds.length}개 테이블 선택됨
          </p>
          <p className="text-[11px] text-charcoal-lighter">
            병합 버튼을 눌러 하나로 합치세요
          </p>
        </div>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-charcoal-lighter">
            테이블을 클릭하여 선택하세요
          </p>
        </div>
      )}

      {/* 테이블 목록 - 클릭으로 다중 선택 가능 */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-charcoal-lighter">전체 테이블 ({tables.length})</p>
          {selectedTableIds.length > 0 && (
            <button
              onClick={() => selectTable(null)}
              className="text-[10px] text-charcoal-lighter hover:text-charcoal"
            >
              선택 해제
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tables.map((t) => {
            const isSelected = selectedTableIds.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => {
                  // 항상 토글 방식으로 다중 선택
                  if (selectedTableIds.length >= 1) {
                    toggleSelectTable(t.id)
                  } else {
                    selectTable(t.id)
                  }
                }}
                className={cn(
                  'text-[11px] font-medium px-2 py-1 rounded-lg',
                  'transition-colors inline-flex items-center gap-1',
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-cream text-charcoal-light hover:bg-border'
                )}
              >
                {isSelected && <CheckSquare size={10} />}
                {t.label}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-charcoal-lighter mt-2 text-center">
          목록에서 여러 개 클릭하여 병합할 수 있습니다
        </p>
      </div>
    </div>
  )
}
