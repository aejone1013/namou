import { useMemo } from 'react'
import { Users, Clock, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { LUNCH_TIMES, DINNER_TIMES, timeToMinutes } from '@/data/dummy'

interface TimeTableProps {
  onClose?: () => void
}

export default function TimeTable({ onClose }: TimeTableProps) {
  const store = useReservationStore()
  const { reservations, activeSession, focusedTableId, setFocusedTable } = store
  const tables = store.getEffectiveTables()
  const OCCUPANCY_LABEL_W = 32
  const OCCUPANCY_GAP_PX = 6

  const times = activeSession === 'lunch' ? LUNCH_TIMES : DINNER_TIMES

  const periodReservations = useMemo(
    () => reservations.filter((r) => r.period === activeSession && r.status !== 'completed'),
    [reservations, activeSession]
  )

  const reservationsByStartTime = useMemo(() => {
    const map = new Map<string, typeof periodReservations>()
    for (const r of periodReservations) {
      const list = map.get(r.startTime) ?? []
      list.push(r)
      map.set(r.startTime, list)
    }
    return map
  }, [periodReservations])

  const activeCountBySlot = useMemo(() => {
    const map = new Map<string, number>()
    for (const time of times) {
      const timeMin = timeToMinutes(time)
      const count = periodReservations.filter((r) => {
        const start = timeToMinutes(r.startTime)
        const end = timeToMinutes(r.endTime)
        return timeMin >= start && timeMin < end
      }).length
      map.set(time, count)
    }
    return map
  }, [periodReservations, times])

  // Per-table occupancy for Gantt bars
  const tablesWithReservation = useMemo(() => {
    return tables
      .filter((t) => t.status === 'occupied' && t.currentTeam)
      .map((t) => {
        const res = t.currentTeam?.reservationId
          ? reservations.find((r) => r.id === t.currentTeam!.reservationId)
          : null
        return { table: t, reservation: res }
      })
      .filter((item) => item.reservation && item.reservation.period === activeSession)
  }, [tables, reservations, activeSession])

  const isTableActiveAt = (resStartTime: string, resEndTime: string, slotTime: string) => {
    const slot = timeToMinutes(slotTime)
    return slot >= timeToMinutes(resStartTime) && slot < timeToMinutes(resEndTime)
  }

  const statusDot: Record<string, string> = {
    waiting: 'bg-primary',
    seated: 'bg-available',
    completed: 'bg-charcoal-lighter',
  }

  const summaryCounts = useMemo(() => {
    let waiting = 0
    let seated = 0
    for (const r of periodReservations) {
      if (r.status === 'waiting') waiting++
      if (r.status === 'seated') seated++
    }
    return {
      waiting,
      seated,
      total: periodReservations.length,
    }
  }, [periodReservations])

  const nowLineRatio = useMemo(() => {
    if (times.length === 0) return null
    const first = timeToMinutes(times[0])
    const second = times[1] ? timeToMinutes(times[1]) : first + 30
    const step = Math.max(1, second - first)
    const [hh, mm] = new Date().toTimeString().slice(0, 5).split(':').map(Number)
    const now = hh * 60 + mm
    const lastEnd = timeToMinutes(times[times.length - 1]) + step
    if (now < first || now > lastEnd) return null
    const ratio = (now - first) / (lastEnd - first)
    return Math.min(1, Math.max(0, ratio))
  }, [times])

  return (
    <aside className="w-[320px] min-w-[320px] h-full bg-surface border-l border-border flex flex-col shadow-xl">
      {/* 헤더 */}
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-primary" />
          <h2 className="text-[13px] font-bold text-charcoal">예약시간대</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-charcoal-lighter hover:text-charcoal hover:bg-cream transition-colors"
            title="닫기"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Gantt per-table bars */}
      {tablesWithReservation.length > 0 && (
        <div className="px-3 pt-2 pb-1.5 border-b border-border">
          <div className="h-1" />
          <div className="relative">
            {nowLineRatio !== null && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{
                  left: `${OCCUPANCY_LABEL_W + OCCUPANCY_GAP_PX}px`,
                  width: `calc(100% - ${OCCUPANCY_LABEL_W + OCCUPANCY_GAP_PX}px)`,
                }}
              >
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary/70"
                  style={{ left: `${nowLineRatio * 100}%` }}
                />
                <div
                  className="absolute top-0 -translate-x-1/2 rounded-full bg-primary text-white text-[8px] px-1 py-0.5 shadow-sm"
                  style={{ left: `${nowLineRatio * 100}%` }}
                >
                  지금
                </div>
              </div>
            )}

            <div className="grid grid-cols-[32px_1fr] gap-x-1.5 mb-1.5">
              <div />
              <div className="flex gap-px">
                {times.map((time) => {
                  const showLabel = time.endsWith(':00')
                  return (
                    <div key={`axis-${time}`} className="flex-1 min-w-0 text-center">
                      <div className={cn('h-1 rounded-[1px]', showLabel ? 'bg-border/70' : 'bg-border/30')} />
                      <div className="h-3 mt-0.5 text-[8px] text-charcoal-lighter tabular-nums leading-none">
                        {showLabel ? time.slice(0, 5) : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-0.5">
              {tablesWithReservation.map(({ table: t, reservation: res }) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFocusedTable(focusedTableId === t.id ? null : t.id)}
                  className={cn(
                    'w-full grid grid-cols-[32px_1fr] gap-x-1.5 items-center rounded-md px-0.5 py-0.5 text-left transition-colors',
                    focusedTableId === t.id ? 'bg-primary/8' : 'hover:bg-cream/80'
                  )}
                  title={`${t.label} 포커스`}
                >
                  <span className="text-[9px] font-medium text-charcoal shrink-0 truncate">{t.label}</span>
                  <div className="flex gap-px">
                    {times.map((time) => {
                      const active = res ? isTableActiveAt(res.startTime, res.endTime, time) : false
                      return (
                        <div
                          key={time}
                          className={cn(
                            'h-2.5 flex-1 rounded-[1px]',
                            active ? 'bg-occupied/70' : 'bg-border/30'
                          )}
                          title={`${t.label} ${time}`}
                        />
                      )
                    })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 타임라인 */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        <div className="mb-1 px-2 py-1 rounded-lg bg-cream border border-border text-[9px] text-charcoal-lighter">
          운영 팁: 같은 시간대 예약이 많으면 오른쪽 점유 막대를 보고 겹치는 구간부터 테이블 재배정하세요.
        </div>
        {times.map((time) => {
          const starting = reservationsByStartTime.get(time) ?? []
          const activeCount = activeCountBySlot.get(time) ?? 0
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
      <div className="px-4 py-2.5 border-t border-border bg-cream/50">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-base font-bold text-primary">{summaryCounts.waiting}</p>
            <p className="text-[10px] text-charcoal-lighter">대기</p>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <p className="text-base font-bold text-available">{summaryCounts.seated}</p>
            <p className="text-[10px] text-charcoal-lighter">착석</p>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <p className="text-base font-bold text-charcoal">{summaryCounts.total}</p>
            <p className="text-[10px] text-charcoal-lighter">{activeSession === 'lunch' ? '점심' : '저녁'} 전체</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
