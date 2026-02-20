import { useState } from 'react'
import { Sun, Moon, Users, Clock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { LUNCH_TIMES, DINNER_TIMES, timeToMinutes } from '@/data/dummy'

type PeriodTab = 'lunch' | 'dinner'

export default function TimeTable() {
  const { reservations } = useReservationStore()
  const [activePeriod, setActivePeriod] = useState<PeriodTab>('lunch')

  const times = activePeriod === 'lunch' ? LUNCH_TIMES : DINNER_TIMES

  // 해당 시간대의 예약만 필터
  const periodReservations = reservations.filter(
    (r) => r.period === activePeriod && r.status !== 'completed'
  )

  // 각 시간 슬롯에 걸쳐있는 예약 찾기
  const getReservationsAtTime = (time: string) => {
    const timeMin = timeToMinutes(time)
    return periodReservations.filter((r) => {
      const start = timeToMinutes(r.startTime)
      const end = timeToMinutes(r.endTime)
      return timeMin >= start && timeMin < end
    })
  }

  const statusColor = {
    waiting: 'bg-primary/20 border-primary/40 text-primary-dark',
    seated: 'bg-available-light border-available/40 text-green-700',
    completed: 'bg-charcoal-lighter/10 border-charcoal-lighter/30 text-charcoal-lighter',
  }

  const statusLabel = {
    waiting: '대기',
    seated: '착석',
    completed: '완료',
  }

  return (
    <aside className="w-[280px] min-w-[280px] h-full bg-surface border-l border-border flex flex-col">
      {/* 헤더 */}
      <div className="p-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-charcoal">타임테이블</h2>
        </div>

        {/* 점심/저녁 탭 */}
        <div className="flex gap-1 bg-cream rounded-xl p-1">
          <button
            onClick={() => setActivePeriod('lunch')}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5',
              'text-xs font-medium py-1.5 rounded-lg',
              'transition-all duration-150',
              activePeriod === 'lunch'
                ? 'bg-surface text-charcoal shadow-sm'
                : 'text-charcoal-lighter hover:text-charcoal-light'
            )}
          >
            <Sun size={12} />
            점심
          </button>
          <button
            onClick={() => setActivePeriod('dinner')}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5',
              'text-xs font-medium py-1.5 rounded-lg',
              'transition-all duration-150',
              activePeriod === 'dinner'
                ? 'bg-surface text-charcoal shadow-sm'
                : 'text-charcoal-lighter hover:text-charcoal-light'
            )}
          >
            <Moon size={12} />
            저녁
          </button>
        </div>
      </div>

      {/* 타임라인 */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          {times.map((time) => {
            const reservationsAtTime = getReservationsAtTime(time)
            const isHour = time.endsWith(':00')

            return (
              <div key={time} className="flex gap-3 min-h-[36px]">
                {/* 시간 라벨 */}
                <div className="w-[44px] shrink-0 pt-0.5">
                  <span
                    className={cn(
                      'text-[11px] tabular-nums',
                      isHour
                        ? 'font-semibold text-charcoal'
                        : 'text-charcoal-lighter'
                    )}
                  >
                    {time}
                  </span>
                </div>

                {/* 슬롯 내용 */}
                <div className="flex-1 border-l border-border pl-3 pb-1">
                  {reservationsAtTime.length > 0 ? (
                    <div className="space-y-1">
                      {reservationsAtTime.map((r) => {
                        // 시작 시간인 경우에만 전체 블록 표시
                        const isStart = r.startTime === time
                        if (!isStart) return null

                        return (
                          <div
                            key={r.id}
                            className={cn(
                              'text-[11px] px-2.5 py-1.5 rounded-lg border',
                              statusColor[r.status]
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{r.name}</span>
                              <span className="text-[10px] opacity-70">
                                {statusLabel[r.status]}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 opacity-70">
                              <span className="flex items-center gap-0.5">
                                <Users size={10} />
                                {r.partySize}명
                              </span>
                              <span>
                                {r.startTime}~{r.endTime}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="h-[18px]" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 하단 요약 */}
      <div className="px-4 py-3 border-t border-border bg-cream/50">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-sm font-bold text-primary">
              {periodReservations.filter((r) => r.status === 'waiting').length}
            </p>
            <p className="text-[10px] text-charcoal-lighter">대기</p>
          </div>
          <div className="w-px h-6 bg-border" />
          <div>
            <p className="text-sm font-bold text-available">
              {periodReservations.filter((r) => r.status === 'seated').length}
            </p>
            <p className="text-[10px] text-charcoal-lighter">착석</p>
          </div>
          <div className="w-px h-6 bg-border" />
          <div>
            <p className="text-sm font-bold text-charcoal">
              {periodReservations.length}
            </p>
            <p className="text-[10px] text-charcoal-lighter">
              {activePeriod === 'lunch' ? '점심' : '저녁'} 전체
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
