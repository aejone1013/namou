import { Users, Clock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { LUNCH_TIMES, DINNER_TIMES, timeToMinutes } from '@/data/dummy'

export default function TimeTable() {
  const { reservations, tables, activeSession } = useReservationStore()

  const times = activeSession === 'lunch' ? LUNCH_TIMES : DINNER_TIMES

  const periodReservations = reservations.filter(
    (r) => r.period === activeSession && r.status !== 'completed'
  )

  // Per-table occupancy for Gantt bars
  const occupiedTables = tables.filter((t) => t.status === 'occupied' && t.currentTeam)
  const tablesWithReservation = occupiedTables
    .map((t) => {
      const res = t.currentTeam?.reservationId
        ? reservations.find((r) => r.id === t.currentTeam!.reservationId)
        : null
      return { table: t, reservation: res }
    })
    .filter((item) => item.reservation && item.reservation.period === activeSession)

  const getReservationsStartingAt = (time: string) => {
    return periodReservations.filter((r) => r.startTime === time)
  }

  const getActiveCount = (time: string) => {
    const timeMin = timeToMinutes(time)
    return periodReservations.filter((r) => {
      const start = timeToMinutes(r.startTime)
      const end = timeToMinutes(r.endTime)
      return timeMin >= start && timeMin < end
    }).length
  }

  // Gantt: is this table active at this time slot?
  const isTableActiveAt = (resStartTime: string, resEndTime: string, slotTime: string) => {
    const slot = timeToMinutes(slotTime)
    return slot >= timeToMinutes(resStartTime) && slot < timeToMinutes(resEndTime)
  }

  const statusDot: Record<string, string> = {
    waiting: 'bg-primary',
    seated: 'bg-available',
    completed: 'bg-charcoal-lighter',
  }

  return (
    <aside className="w-[320px] min-w-[320px] h-full bg-surface border-l border-border flex flex-col">
      {/* 헤더 */}
      <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
        <Clock size={14} className="text-primary" />
        <h2 className="text-[13px] font-bold text-charcoal">예약시간대</h2>
      </div>

      {/* 세션 표시 */}
      <div className="px-3 pt-2 pb-1.5">
        <span className="text-[11px] font-medium text-charcoal-light">
          {activeSession === 'lunch' ? '점심' : '저녁'} 시간대
        </span>
      </div>

      {/* Gantt per-table bars */}
      {tablesWithReservation.length > 0 && (
        <div className="px-3 py-1.5 border-b border-border">
          <p className="text-[9px] text-charcoal-lighter mb-1">테이블 점유</p>
          <div className="space-y-0.5">
            {tablesWithReservation.map(({ table: t, reservation: res }) => (
              <div key={t.id} className="flex items-center gap-1.5">
                <span className="text-[9px] font-medium text-charcoal w-[32px] shrink-0 truncate">{t.label}</span>
                <div className="flex-1 flex gap-px">
                  {times.map((time) => {
                    const active = res ? isTableActiveAt(res.startTime, res.endTime, time) : false
                    return (
                      <div
                        key={time}
                        className={cn(
                          'h-2 flex-1 rounded-[1px]',
                          active ? 'bg-occupied/70' : 'bg-border/30'
                        )}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 타임라인 */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {times.map((time) => {
          const starting = getReservationsStartingAt(time)
          const activeCount = getActiveCount(time)
          const isHour = time.endsWith(':00')

          return (
            <div key={time} className={cn(
              "flex gap-2 min-h-[26px]",
              isHour && "border-t border-border/60 pt-0.5 mt-0.5"
            )}>
              <div className="w-[36px] shrink-0 pt-0.5 text-right">
                <span className={cn(
                  'tabular-nums',
                  isHour
                    ? 'text-[11px] font-bold text-charcoal'
                    : 'text-[10px] text-charcoal-lighter'
                )}>
                  {time}
                </span>
              </div>

              <div className="w-1 shrink-0 flex items-stretch">
                <div className={cn('w-full rounded-full', activeCount > 0 ? 'bg-primary/40' : 'bg-border/40')} />
              </div>

              <div className="flex-1 pb-0.5">
                {starting.length > 0 ? (
                  <div className="space-y-0.5">
                    {starting.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md bg-cream border border-border"
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusDot[r.status])} />
                        <span className="font-medium text-charcoal truncate">{r.name}</span>
                        <span className="text-charcoal-lighter flex items-center gap-0.5 shrink-0">
                          <Users size={8} />
                          {r.partySize}
                        </span>
                        <span className="text-[9px] text-charcoal-lighter shrink-0 ml-auto">~{r.endTime}</span>
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
      <div className="px-3 py-2.5 border-t border-border bg-cream/50">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-sm font-bold text-primary">{periodReservations.filter((r) => r.status === 'waiting').length}</p>
            <p className="text-[9px] text-charcoal-lighter">대기</p>
          </div>
          <div className="w-px h-5 bg-border" />
          <div>
            <p className="text-sm font-bold text-available">{periodReservations.filter((r) => r.status === 'seated').length}</p>
            <p className="text-[9px] text-charcoal-lighter">착석</p>
          </div>
          <div className="w-px h-5 bg-border" />
          <div>
            <p className="text-sm font-bold text-charcoal">{periodReservations.length}</p>
            <p className="text-[9px] text-charcoal-lighter">{activeSession === 'lunch' ? '점심' : '저녁'} 전체</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
