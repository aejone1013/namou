import { Trash2, Plus, Users, Tag, Merge, Minus, CheckSquare, Scissors, AlignCenter } from 'lucide-react'
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
    splitTable,
    alignTables,
  } = useReservationStore()

  const selectedTable =
    selectedTableIds.length === 1
      ? tables.find((t) => t.id === selectedTableIds[0])
      : null

  const canMerge = selectedTableIds.length >= 2
  const canSplit = selectedTable?.mergedFrom && selectedTable.mergedFrom.length >= 2

  return (
    <div className="absolute top-4 right-4 w-[200px] bg-surface rounded-2xl border border-border shadow-lg z-30 overflow-hidden">
      {/* 헤더 */}
      <div className="px-3 py-2.5 border-b border-border bg-cream/50">
        <p className="text-[11px] font-semibold text-charcoal">테이블 편집</p>
      </div>

      {/* 버튼 */}
      <div className="px-3 py-2.5 border-b border-border space-y-1.5">
        <div className="flex gap-1.5">
          <button
            onClick={() => addTable()}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1',
              'text-[11px] font-medium py-1.5 rounded-lg',
              'bg-cream hover:bg-border text-charcoal-light',
              'transition-colors border border-border'
            )}
          >
            <Plus size={12} /> 추가
          </button>
          <button
            onClick={alignTables}
            className={cn(
              'inline-flex items-center justify-center gap-1',
              'text-[11px] font-medium py-1.5 px-2.5 rounded-lg',
              'bg-cream hover:bg-border text-charcoal-light',
              'transition-colors border border-border'
            )}
          >
            <AlignCenter size={12} /> 정렬
          </button>
        </div>

        <button
          onClick={mergeTables}
          disabled={!canMerge}
          className={cn(
            'w-full inline-flex items-center justify-center gap-1',
            'text-[11px] font-medium py-1.5 rounded-lg',
            'transition-colors border',
            canMerge
              ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
              : 'bg-cream border-border text-charcoal-lighter/50 cursor-not-allowed'
          )}
        >
          <Merge size={12} />
          병합 {canMerge && `(${selectedTableIds.length}개)`}
        </button>
      </div>

      {/* 선택된 테이블 속성 */}
      {selectedTable ? (
        <div className="px-3 py-2.5 space-y-2.5">
          <p className="text-[10px] text-charcoal-lighter">선택된 테이블</p>

          <div>
            <label className="flex items-center gap-1 text-[10px] text-charcoal-light mb-0.5">
              <Tag size={10} /> 이름
            </label>
            <input
              type="text"
              value={selectedTable.label}
              onChange={(e) => updateTable(selectedTable.id, { label: e.target.value })}
              className={cn(
                'w-full px-2.5 py-1 text-xs rounded-lg',
                'bg-cream border border-border text-charcoal',
                'focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10'
              )}
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-[10px] text-charcoal-light mb-0.5">
              <Users size={10} /> 좌석 수
            </label>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateTable(selectedTable.id, { seats: Math.max(1, selectedTable.seats - 1) })}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-cream border border-border text-charcoal hover:bg-border transition-colors active:scale-95"
              >
                <Minus size={14} />
              </button>
              <span className="flex-1 text-center text-sm font-bold text-charcoal">{selectedTable.seats}</span>
              <button
                onClick={() => updateTable(selectedTable.id, { seats: Math.min(20, selectedTable.seats + 1) })}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-cream border border-border text-charcoal hover:bg-border transition-colors active:scale-95"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="flex gap-1.5">
            {/* 분할 */}
            {canSplit && (
              <button
                onClick={() => splitTable(selectedTable.id)}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1',
                  'text-[11px] font-medium py-1.5 rounded-lg',
                  'text-primary bg-primary/10 hover:bg-primary/20',
                  'transition-colors'
                )}
              >
                <Scissors size={12} />
                분할
              </button>
            )}
            <button
              onClick={() => removeTable(selectedTable.id)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1',
                'text-[11px] font-medium py-1.5 rounded-lg',
                'text-occupied bg-occupied-light hover:bg-occupied/20',
                'transition-colors'
              )}
            >
              <Trash2 size={12} />
              삭제
            </button>
          </div>
        </div>
      ) : selectedTableIds.length >= 2 ? (
        <div className="px-3 py-3 text-center space-y-1">
          <p className="text-[11px] font-medium text-primary">{selectedTableIds.length}개 선택됨</p>
          <p className="text-[10px] text-charcoal-lighter">병합 버튼을 눌러 합치세요</p>
        </div>
      ) : (
        <div className="px-3 py-4 text-center">
          <p className="text-[10px] text-charcoal-lighter">테이블을 클릭하여 선택</p>
        </div>
      )}

      {/* 테이블 목록 */}
      <div className="px-3 py-2.5 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-charcoal-lighter">테이블 ({tables.length})</p>
          {selectedTableIds.length > 0 && (
            <button onClick={() => selectTable(null)} className="text-[9px] text-charcoal-lighter hover:text-charcoal">
              해제
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {tables.map((t) => {
            const isSelected = selectedTableIds.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (selectedTableIds.length >= 1) {
                    toggleSelectTable(t.id)
                  } else {
                    selectTable(t.id)
                  }
                }}
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-md',
                  'transition-colors inline-flex items-center gap-0.5',
                  isSelected ? 'bg-primary text-white' : 'bg-cream text-charcoal-light hover:bg-border'
                )}
              >
                {isSelected && <CheckSquare size={8} />}
                {t.label}
              </button>
            )
          })}
        </div>
        <p className="text-[9px] text-charcoal-lighter mt-1.5 text-center">
          클릭으로 다중 선택 후 병합
        </p>
      </div>
    </div>
  )
}
