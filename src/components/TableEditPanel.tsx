import { useState, useEffect } from 'react'
import { Trash2, Plus, Tag, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { useToastStore } from '@/store/useToastStore'
import { toastActions, toastMessages } from '@/features/toast/toastPresets'

export default function TableEditPanel() {
  const {
    tables,
    selectedTableIds,
    selectTable,
    toggleSelectTable,
    updateTable,
    addTable,
    removeTable,
    saveUndoSnapshot,
    undo,
  } = useReservationStore()
  const toast = useToastStore()

  const selectedTable =
    selectedTableIds.length === 1
      ? tables.find((t) => t.id === selectedTableIds[0])
      : null

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
        <p className="text-[12px] font-semibold text-charcoal">테이블 편집</p>
      </div>

      {/* 버튼 */}
      <div className="px-3 py-2.5 border-b border-border space-y-1.5">
        <div className="flex gap-1.5">
          <button
            onClick={() => addTable()}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1',
              'text-[12px] font-medium py-1.5 rounded-lg',
              'bg-cream hover:bg-border text-charcoal-light',
              'transition-colors border border-border'
            )}
          >
            <Plus size={12} /> 추가
          </button>
        </div>
      </div>

      {/* 선택된 테이블 속성 */}
      {selectedTable ? (
        <div className="px-3 py-2.5 space-y-2.5">
          <p className="text-[12px] text-charcoal-lighter">선택된 테이블</p>

          <div>
            <label className="flex items-center gap-1 text-[12px] text-charcoal-light mb-0.5">
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
                if (/^T\d+$/.test(labelDraft)) {
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
                'w-full px-2.5 py-1 text-sm rounded-lg',
                'bg-cream border text-charcoal',
                'focus:outline-none focus:ring-1',
                labelError
                  ? 'border-occupied focus:border-occupied focus:ring-occupied/20'
                  : 'border-border focus:border-primary/40 focus:ring-primary/10'
              )}
            />
            {labelError && (
              <p className="text-[9px] text-occupied mt-0.5">T+숫자 형식 (예: T1, T2)</p>
            )}
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => {
                const { sessionData } = useReservationStore.getState()
                const hasOccupied = (['lunch', 'dinner'] as const).some((s) => {
                  const sd = sessionData[s]
                  const ts = sd.tableStates[selectedTable.id]
                  if (ts?.currentTeam || ts?.nextBooking) return true
                  return sd.merges.some((m) =>
                    m.mergedFrom.some((o) => o.id === selectedTable.id) &&
                    (sd.tableStates[m.mergedId]?.currentTeam || sd.tableStates[m.mergedId]?.nextBooking)
                  )
                })
                if (hasOccupied && !window.confirm('이 테이블을 삭제하면 연결된 팀은 대기 상태로 돌아갑니다. 삭제할까요?')) return
                saveUndoSnapshot('테이블 삭제')
                removeTable(selectedTable.id)
                toast.show(toastMessages.tableDeleted, 'info', toastActions.undo(() => undo()))
              }}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1',
                'text-[12px] font-medium py-1.5 rounded-lg',
                'text-occupied bg-occupied-light hover:bg-occupied/20',
                'transition-colors'
              )}
            >
              <Trash2 size={12} />
              삭제
            </button>
          </div>
        </div>
      ) : (
        <div className="px-3 py-4 text-center">
          <p className="text-[12px] text-charcoal-lighter">테이블을 클릭하여 선택</p>
        </div>
      )}

      {/* 테이블 목록 */}
      <div className="px-3 py-2.5 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[12px] text-charcoal-lighter">테이블 ({tables.length})</p>
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
                  'text-[12px] font-medium px-1.5 py-0.5 rounded-md',
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
      </div>
    </div>
  )
}
