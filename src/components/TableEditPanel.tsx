import { useState, useEffect } from 'react'
import { Trash2, Plus, Users, Tag, Merge, Minus, CheckSquare, Scissors, AlignVerticalJustifyStart } from 'lucide-react'
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
    alignTablesVertical,
  } = useReservationStore()

  const selectedTable =
    selectedTableIds.length === 1
      ? tables.find((t) => t.id === selectedTableIds[0])
      : null

  const canMerge = selectedTableIds.length >= 2
  const canSplit = selectedTable?.mergedFrom && selectedTable.mergedFrom.length >= 2

  const [labelDraft, setLabelDraft] = useState(selectedTable?.label || '')
  const [labelError, setLabelError] = useState(false)

  useEffect(() => {
    setLabelDraft(selectedTable?.label || '')
    setLabelError(false)
  }, [selectedTable?.id, selectedTable?.label])

  return (
    <div className="bg-surface overflow-hidden">
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
            onClick={alignTablesVertical}
            disabled={selectedTableIds.length < 2}
            className={cn(
              'inline-flex items-center justify-center',
              'text-[11px] font-medium py-1.5 px-2 rounded-lg',
              'transition-colors border',
              selectedTableIds.length >= 2
                ? 'bg-cream hover:bg-border text-charcoal-light border-border'
                : 'bg-cream border-border text-charcoal-lighter/50 cursor-not-allowed'
            )}
            title="수직 정렬"
          >
            <AlignVerticalJustifyStart size={12} />
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
              value={labelDraft}
              onChange={(e) => {
                setLabelDraft(e.target.value)
                setLabelError(false)
              }}
              onBlur={() => {
                if (/^T\d+(\+T\d+)*$/.test(labelDraft) || /^T\d+$/.test(labelDraft) || /^T\d+~T\d+$/.test(labelDraft)) {
                  updateTable(selectedTable.id, { label: labelDraft })
                  setLabelError(false)
                } else {
                  setLabelDraft(selectedTable.label)
                  setLabelError(true)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              className={cn(
                'w-full px-2.5 py-1 text-xs rounded-lg',
                'bg-cream border text-charcoal',
                'focus:outline-none focus:ring-1',
                labelError
                  ? 'border-occupied focus:border-occupied focus:ring-occupied/20'
                  : 'border-border focus:border-primary/40 focus:ring-primary/10'
              )}
            />
            {labelError && (
              <p className="text-[9px] text-occupied mt-0.5">T+숫자 형식 (예: T1, T1+T2, T1~T3)</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1 text-[10px] text-charcoal-light mb-0.5">
              <Users size={10} /> 좌석 수
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateTable(selectedTable.id, { seats: Math.max(1, selectedTable.seats - 1) })}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-cream border border-border text-charcoal hover:bg-border transition-colors active:scale-95"
              >
                <Minus size={18} />
              </button>
              <span className="flex-1 text-center text-base font-bold text-charcoal">{selectedTable.seats}</span>
              <button
                onClick={() => updateTable(selectedTable.id, { seats: Math.min(20, selectedTable.seats + 1) })}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-cream border border-border text-charcoal hover:bg-border transition-colors active:scale-95"
              >
                <Plus size={18} />
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
          {[...tables].sort((a, b) => {
            const numA = parseInt(a.label.replace(/\D/g, '')) || 0
            const numB = parseInt(b.label.replace(/\D/g, '')) || 0
            return numA - numB
          }).map((t) => {
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
