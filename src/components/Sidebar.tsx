import { useState } from 'react'
import { Plus, Clock, Users, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import ReservationCard from './ReservationCard'
import logoImage from '@/assets/namou.jpg'

type TabType = 'waiting' | 'seated' | 'completed'
type WaitingPreset = 'all' | 'soon' | 'assigned' | 'unassigned'

const tabConfig: { key: TabType; label: string; icon: typeof Clock }[] = [
  { key: 'waiting', label: '대기', icon: Clock },
  { key: 'seated', label: '착석', icon: Users },
  { key: 'completed', label: '완료', icon: CheckCircle },
]

export default function Sidebar() {
  const logoSrc = logoImage
  const { reservations, openModal, activeSession, sessionData } = useReservationStore()
  const [activeTab, setActiveTab] = useState<TabType>('waiting')
  const [waitingPreset, setWaitingPreset] = useState<WaitingPreset>('all')

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

  const assignedWaitingReservationIds = new Set(
    Object.values(sessionData[activeSession].tableStates)
      .flatMap((ts) => ts.plannedBookings ?? (ts.nextBooking ? [ts.nextBooking] : []))
      .map((b) => b.reservationId)
  )

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  const filteredReservations = sessionReservations
    .filter((r) => r.status === activeTab)
    .filter((r) => {
      if (activeTab !== 'waiting') return true
      if (waitingPreset === 'all') return true
      if (waitingPreset === 'assigned') return assignedWaitingReservationIds.has(r.id)
      if (waitingPreset === 'unassigned') return !assignedWaitingReservationIds.has(r.id)
      if (waitingPreset === 'soon') {
        const diff = toMinutes(r.startTime) - nowMinutes
        return diff >= 0 && diff <= 30
      }
      return true
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const soonCount = sessionReservations.filter((r) => {
    if (r.status !== 'waiting') return false
    const diff = toMinutes(r.startTime) - nowMinutes
    return diff >= 0 && diff <= 30
  }).length

  const renderReservation = (reservation: typeof reservations[0]) => (
    <ReservationCard key={reservation.id} reservation={reservation} />
  )

  return (
    <aside className="w-full md:w-[clamp(300px,21vw,360px)] md:min-w-[300px] h-full bg-surface md:border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-border bg-surface shadow-sm">
              <img
                src={logoSrc}
                alt="namou logo"
                className="w-full h-full object-cover"
                draggable={false}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoImage }}
              />
            </div>
            <h1 className="text-base font-bold text-charcoal tracking-tight">namou</h1>
          </div>
          <button
            onClick={() => openModal()}
            className={cn(
              'inline-flex items-center gap-1',
              'text-sm font-semibold text-primary',
              'bg-primary/10 hover:bg-primary/20',
              'px-3 py-2 rounded-lg',
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
                  'text-[13px] font-semibold py-2 rounded-md',
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
                    'min-w-[18px] h-[18px] px-0.5',
                    'text-[12px] font-bold rounded-full',
                    isActive ? 'bg-primary text-white' : 'bg-border text-charcoal-lighter'
                  )}
                >
                  {counts[tab.key]}
                </span>
              </button>
            )
          })}
        </div>

        {activeTab === 'waiting' && (
          <div className="mt-2 grid grid-cols-4 gap-1">
            {([
              { key: 'all', label: '전체' },
              { key: 'soon', label: '곧 시작' },
              { key: 'assigned', label: '배정완료' },
              { key: 'unassigned', label: '미배정' },
            ] as Array<{ key: WaitingPreset; label: string }>).map((preset) => (
              <button
                key={preset.key}
                onClick={() => setWaitingPreset(preset.key)}
                className={cn(
                  'text-[12px] font-semibold py-1.5 rounded-md border transition-colors',
                  waitingPreset === preset.key
                    ? 'bg-surface border-primary/30 text-primary'
                    : 'bg-cream border-border text-charcoal-lighter hover:text-charcoal hover:bg-border'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'waiting' && soonCount > 0 && (
          <button
            onClick={() => {
              setActiveTab('waiting')
              setWaitingPreset('soon')
            }}
            className="mt-2 w-full text-left px-3 py-2 rounded-xl border border-occupied/30 bg-occupied-light text-occupied text-[13px] font-semibold"
          >
            30분 내 시작 예약 {soonCount}건
          </button>
        )}
      </div>

      {/* Reservation List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-charcoal-lighter">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-border bg-surface/70 mb-2 opacity-80">
              <img
                src={logoSrc}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = logoImage }}
              />
            </div>
            <p className="text-sm">
              {activeTab === 'waiting' && '대기 중인 예약이 없습니다'}
              {activeTab === 'seated' && '착석 중인 팀이 없습니다'}
              {activeTab === 'completed' && '완료된 예약이 없습니다'}
            </p>
            {activeTab === 'waiting' && (
              <p className="text-[12px] mt-1">위의 추가 버튼을 눌러주세요</p>
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
            <p className="text-[12px] text-charcoal-lighter">대기</p>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <p className="text-base font-bold text-available">{seatedCount}</p>
            <p className="text-[12px] text-charcoal-lighter">착석</p>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <p className="text-base font-bold text-charcoal">{sessionReservations.length}</p>
            <p className="text-[12px] text-charcoal-lighter">전체</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
