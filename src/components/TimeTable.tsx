import { useState } from 'react'
import { Sun, Moon, Users, Clock, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { LUNCH_TIMES, DINNER_TIMES, timeToMinutes } from '@/data/dummy'

type PeriodTab = 'lunch' | 'dinner'

interface TimeTableProps {
  onClose: () => void
}

export default function TimeTable({ onClose }: TimeTableProps) {
  const { reservations } = useReservationStore()
  const [activePeriod, setActivePeriod] = useState<PeriodTab>('lunch')

  const times = activePeriod === 'lunch' ? LUNCH_TIMES : DINNER_TIMES

  const periodReservations = reservations.filter(
    (r) => r.period === activePeriod && r.status !== 'completed'
  )

  // 각 시간 슬롯에서 시작하는 예약만 표시
  const getReservationsStartingAt = (time: string) => {
    return periodReservations.filter((r) => r.startTime === time)
  }

  // 해당 시간에 걸쳐있는 예약 수 (타임라인 바 표시용)
  const getActiveCount = (time: string) => {
    const timeMin = timeToMinutes(time)
    return periodReservations.filter((r) => {
      const start = timeToMinutes(r.startTime)
      const end = timeToMinutes(r.endTime)
      return timeMin >= start && timeMin < end
    }).length
  }

  const statusDot: Record<string, string> = {
    waiting: 'bg-primary',
    seated: 'bg-available',
    completed: 'bg-charcoal-lighter',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/30 backdrop-blur-sm">
      <div className="w-[360px] max-h-[85vh] bg-surface rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-primary" />
            <h2 className="text-sm font-bold text-charcoal">예약시간대</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-cream text-charcoal-lighter hover:text-charcoal transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 점심/저녁 탭 */}
        <div className="px-4 pt-3 pb-2">
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
              점심 (12:00-14:00)
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
              저녁 (19:00-21:30)
            </button>
          </div>
        </div>

        {/* 타임라인 */}
        <div className="flex-1 overflow-y-auto px-4 py-1">
          {times.map((time) => {
            const starting = getReservationsStartingAt(time)
            const activeCount = getActiveCount(time)
            const isHour = time.endsWith(':00')

            return (
              <div key={time} className="flex gap-2.5 min-h-[28px]">
                {/* 시간 */}
                <div className="w-[40px] shrink-0 pt-0.5 text-right">
                  <span
                    className={cn(
                      'text-[11px] tabular-nums',
                      isHour ? 'font-semibold text-charcoal' : 'text-charcoal-lighter'
                    )}
                  >
                    {time}
                  </span>
                </div>

                {/* 활성 바 */}
                <div className="w-1 shrink-0 flex items-stretch">
                  <div
                    className={cn(
                      'w-full rounded-full',
                      activeCount > 0 ? 'bg-primary/40' : 'bg-border/50'
                    )}
                  />
                </div>

                {/* 예약 카드 */}
                <div className="flex-1 pb-0.5">
                  {starting.length > 0 ? (
                    <div className="space-y-1">
                      {starting.map((r) => (
                        <div
                          key={r.id}
                          className={cn(
                            'flex items-center gap-2 text-[11px] px-2 py-1 rounded-lg',
                            'bg-cream border border-border'
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusDot[r.status])} />
                          <span className="font-medium text-charcoal truncate">{r.name}</span>
                          <span className="text-charcoal-lighter flex items-center gap-0.5 shrink-0">
                            <Users size={9} />
                            {r.partySize}
                          </span>
                          <span className="text-[10px] text-charcoal-lighter shrink-0 ml-auto">
                            ~{r.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        {/* 하단 요약 */}
        <div className="px-4 py-2.5 border-t border-border bg-cream/50">
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-sm font-bold text-primary">
                {periodReservations.filter((r) => r.status === 'waiting').length}
              </p>
              <p className="text-[9px] text-charcoal-lighter">대기</p>
            </div>
            <div className="w-px h-5 bg-border" />
            <div>
              <p className="text-sm font-bold text-available">
                {periodReservations.filter((r) => r.status === 'seated').length}
              </p>
              <p className="text-[9px] text-charcoal-lighter">착석</p>
            </div>
            <div className="w-px h-5 bg-border" />
            <div>
              <p className="text-sm font-bold text-charcoal">
                {periodReservations.length}
              </p>
              <p className="text-[9px] text-charcoal-lighter">
                {activePeriod === 'lunch' ? '점심' : '저녁'} 전체
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
