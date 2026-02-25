import { useState } from 'react'
import { Plus, Coffee, Clock, Users, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import DraggableReservationCard from './DraggableReservationCard'
import ReservationCard from './ReservationCard'

type TabType = 'waiting' | 'seated' | 'completed'

const tabConfig: { key: TabType; label: string; icon: typeof Clock }[] = [
  { key: 'waiting', label: '대기', icon: Clock },
  { key: 'seated', label: '착석', icon: Users },
  { key: 'completed', label: '완료', icon: CheckCircle },
]

export default function Sidebar() {
  const { reservations, openModal, activeSession } = useReservationStore()
  const [activeTab, setActiveTab] = useState<TabType>('waiting')

  // Filter by current session
  const sessionReservations = reservations.filter((r) => r.period === activeSession)

  const waitingCount = sessionReservations.filter((r) => r.status === 'waiting').length
  const seatedCount = sessionReservations.filter((r) => r.status === 'seated').length
  const completedCount = sessionReservations.filter((r) => r.status === 'completed').length

  const counts: Record<TabType, number> = {
    waiting: waitingCount,
    seated: seatedCount,
    completed: completedCount,
  }

  const filteredReservations = sessionReservations
    .filter((r) => r.status === activeTab)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const renderReservation = (reservation: typeof reservations[0]) =>
    activeTab === 'waiting' ? (
      <DraggableReservationCard key={reservation.id} reservation={reservation} />
    ) : (
      <ReservationCard key={reservation.id} reservation={reservation} />
    )

  return (
    <aside className="w-[240px] min-w-[240px] h-full bg-surface border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <Coffee size={16} className="text-primary" />
            </div>
            <h1 className="text-base font-bold text-charcoal tracking-tight">namou</h1>
          </div>
          <button
            onClick={() => openModal()}
            className={cn(
              'inline-flex items-center gap-1',
              'text-xs font-medium text-primary',
              'bg-primary/10 hover:bg-primary/20',
              'px-2.5 py-1 rounded-lg',
              'transition-colors duration-150'
            )}
          >
            <Plus size={14} />
            추가
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-cream rounded-lg p-0.5">
          {tabConfig.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1',
                  'text-[11px] font-medium py-1.5 rounded-md',
                  'transition-all duration-150',
                  isActive
                    ? 'bg-surface text-charcoal shadow-sm'
                    : 'text-charcoal-lighter hover:text-charcoal-light'
                )}
              >
                <Icon size={11} />
                <span
                  className={cn(
                    'inline-flex items-center justify-center',
                    'min-w-[16px] h-[16px] px-0.5',
                    'text-[9px] font-bold rounded-full',
                    isActive ? 'bg-primary text-white' : 'bg-border text-charcoal-lighter'
                  )}
                >
                  {counts[tab.key]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Reservation List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-charcoal-lighter">
            <Coffee size={28} className="mb-2 opacity-30" />
            <p className="text-xs">
              {activeTab === 'waiting' && '대기 중인 예약이 없습니다'}
              {activeTab === 'seated' && '착석 중인 팀이 없습니다'}
              {activeTab === 'completed' && '완료된 예약이 없습니다'}
            </p>
            {activeTab === 'waiting' && (
              <p className="text-[10px] mt-1">위의 추가 버튼을 눌러주세요</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReservations.map(renderReservation)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border bg-cream/50">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-base font-bold text-primary">{waitingCount}</p>
            <p className="text-[10px] text-charcoal-lighter">대기</p>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <p className="text-base font-bold text-available">{seatedCount}</p>
            <p className="text-[10px] text-charcoal-lighter">착석</p>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <p className="text-base font-bold text-charcoal">{sessionReservations.length}</p>
            <p className="text-[10px] text-charcoal-lighter">전체</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
