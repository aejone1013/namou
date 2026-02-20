import { useState } from 'react'
import { Plus, Coffee, Clock, Users, CheckCircle, Sun, Moon } from 'lucide-react'
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
  const { reservations, openModal } = useReservationStore()
  const [activeTab, setActiveTab] = useState<TabType>('waiting')

  const waitingCount = reservations.filter((r) => r.status === 'waiting').length
  const seatedCount = reservations.filter((r) => r.status === 'seated').length
  const completedCount = reservations.filter((r) => r.status === 'completed').length

  const counts: Record<TabType, number> = {
    waiting: waitingCount,
    seated: seatedCount,
    completed: completedCount,
  }

  const filteredReservations = reservations
    .filter((r) => r.status === activeTab)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  // 점심/저녁 그룹 분리
  const lunchReservations = filteredReservations.filter((r) => r.period === 'lunch')
  const dinnerReservations = filteredReservations.filter((r) => r.period === 'dinner')

  const renderReservation = (reservation: typeof reservations[0]) =>
    activeTab === 'waiting' ? (
      <DraggableReservationCard key={reservation.id} reservation={reservation} />
    ) : (
      <ReservationCard key={reservation.id} reservation={reservation} />
    )

  return (
    <aside className="w-[340px] min-w-[340px] h-full bg-surface border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Coffee size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-charcoal tracking-tight">
                namou
              </h1>
              <p className="text-xs text-charcoal-lighter">
                오늘의 예약 관리
              </p>
            </div>
          </div>
          <button
            onClick={() => openModal()}
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

        {/* Tabs */}
        <div className="flex gap-1 bg-cream rounded-xl p-1">
          {tabConfig.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1.5',
                  'text-xs font-medium py-2 rounded-lg',
                  'transition-all duration-150',
                  isActive
                    ? 'bg-surface text-charcoal shadow-sm'
                    : 'text-charcoal-lighter hover:text-charcoal-light'
                )}
              >
                <Icon size={13} />
                {tab.label}
                <span
                  className={cn(
                    'inline-flex items-center justify-center',
                    'min-w-[18px] h-[18px] px-1',
                    'text-[10px] font-bold rounded-full',
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-border text-charcoal-lighter'
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
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {filteredReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-charcoal-lighter">
            <Coffee size={32} className="mb-3 opacity-30" />
            <p className="text-sm">
              {activeTab === 'waiting' && '대기 중인 예약이 없습니다'}
              {activeTab === 'seated' && '착석 중인 팀이 없습니다'}
              {activeTab === 'completed' && '완료된 예약이 없습니다'}
            </p>
            {activeTab === 'waiting' && (
              <p className="text-xs mt-1">위의 추가 버튼을 눌러주세요</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 점심 그룹 */}
            {lunchReservations.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <Sun size={13} className="text-yellow-500" />
                  <span className="text-[11px] font-semibold text-charcoal-light">
                    점심
                  </span>
                  <span className="text-[10px] text-charcoal-lighter">
                    ({lunchReservations.length})
                  </span>
                </div>
                <div className="space-y-3">
                  {lunchReservations.map(renderReservation)}
                </div>
              </div>
            )}

            {/* 저녁 그룹 */}
            {dinnerReservations.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <Moon size={13} className="text-indigo-400" />
                  <span className="text-[11px] font-semibold text-charcoal-light">
                    저녁
                  </span>
                  <span className="text-[10px] text-charcoal-lighter">
                    ({dinnerReservations.length})
                  </span>
                </div>
                <div className="space-y-3">
                  {dinnerReservations.map(renderReservation)}
                </div>
              </div>
            )}
          </div>
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
