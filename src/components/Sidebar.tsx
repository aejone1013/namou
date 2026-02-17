import { CalendarDays, Plus, Coffee } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import DraggableReservationCard from './DraggableReservationCard'

export default function Sidebar() {
  const { reservations, openModal } = useReservationStore()

  const waitingCount = reservations.filter((r) => r.status === 'waiting').length
  const seatedCount = reservations.filter((r) => r.status === 'seated').length

  return (
    <aside className="w-[340px] min-w-[340px] h-full bg-surface border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Coffee size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-charcoal tracking-tight">
              CozyTable
            </h1>
            <p className="text-xs text-charcoal-lighter">
              오늘의 예약 관리
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-primary" />
            <span className="text-sm font-medium text-charcoal">
              대기 목록
            </span>
            <span
              className={cn(
                'inline-flex items-center justify-center',
                'min-w-[22px] h-[22px] px-1.5',
                'bg-primary text-white text-xs font-bold rounded-full'
              )}
            >
              {waitingCount}
            </span>
          </div>
          <button
            onClick={openModal}
            className={cn(
              'inline-flex items-center gap-1.5',
              'text-sm font-medium text-primary',
              'bg-primary/10 hover:bg-primary/20',
              'px-3 py-1.5 rounded-xl',
              'transition-colors duration-150'
            )}
          >
            <Plus size={16} />
            추가
          </button>
        </div>
      </div>

      {/* Reservation List */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
        {reservations.filter((r) => r.status !== 'completed').length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-charcoal-lighter">
            <Coffee size={32} className="mb-3 opacity-30" />
            <p className="text-sm">아직 예약이 없습니다</p>
            <p className="text-xs mt-1">위의 추가 버튼을 눌러주세요</p>
          </div>
        ) : (
          reservations
            .filter((r) => r.status !== 'completed')
            .map((reservation) => (
              <DraggableReservationCard key={reservation.id} reservation={reservation} />
            ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-5 py-4 border-t border-border bg-cream/50">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-lg font-bold text-primary">{waitingCount}</p>
            <p className="text-[11px] text-charcoal-lighter">대기</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold text-available">{seatedCount}</p>
            <p className="text-[11px] text-charcoal-lighter">착석</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold text-charcoal">
              {reservations.length}
            </p>
            <p className="text-[11px] text-charcoal-lighter">전체</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
