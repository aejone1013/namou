import { ArrowRightLeft, XCircle } from 'lucide-react'
import type { TableInfo } from '@/data/dummy'

interface OccupiedMoveClearActionsProps {
  showMoveSelect: boolean
  availableForMove: TableInfo[]
  onMove: (tableId: string) => void
  onShowMoveSelect: () => void
  onCancelMoveSelect: () => void
  onClear: () => void
}

export default function OccupiedMoveClearActions({
  showMoveSelect,
  availableForMove,
  onMove,
  onShowMoveSelect,
  onCancelMoveSelect,
  onClear,
}: OccupiedMoveClearActionsProps) {
  if (showMoveSelect) {
    return (
      <div className="space-y-1.5">
        <p className="text-[12px] text-charcoal-lighter">이동할 테이블:</p>
        {availableForMove.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {availableForMove.map((t) => (
              <button
                key={t.id}
                onClick={() => onMove(t.id)}
                className="text-[12px] font-medium px-1.5 py-0.5 rounded-md bg-cream hover:bg-primary/10 text-charcoal border border-border hover:border-primary/30 transition-colors"
              >
                {t.label} · {t.seats}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-charcoal-lighter">빈 테이블 없음</p>
        )}
        <button onClick={onCancelMoveSelect} className="text-[12px] text-charcoal-lighter hover:text-charcoal">취소</button>
      </div>
    )
  }

  return (
    <div className="flex gap-1.5">
      <button
        onClick={onShowMoveSelect}
        className="flex-1 inline-flex items-center justify-center gap-1 text-[12px] font-medium py-1.5 rounded-xl text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
      >
        <ArrowRightLeft size={12} />
        이동
      </button>
      <button
        onClick={onClear}
        className="flex-1 inline-flex items-center justify-center gap-1 text-[12px] font-medium py-1.5 rounded-xl text-occupied bg-occupied-light hover:bg-occupied/20 transition-colors"
      >
        <XCircle size={12} />
        비우기
      </button>
    </div>
  )
}

