import { useState, useEffect } from 'react'
import {
  Pencil, RotateCcw, Trash2, Users, Clock, XCircle, UserPlus, Minus, Plus,
  ArrowRightLeft, CalendarClock, X, Info, Armchair, Settings,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { compareTableLabel } from '@/data/dummy'
import TableEditPanel from './TableEditPanel'

export default function ControlPanel() {
  const {
    focusedTableId,
    tables,
    reservations,
    isEditMode,
    toggleEditMode,
    resetReservations,
    resetSetup,
    clearTable,
    walkInTable,
    moveToTable,
    seatReservation,
    setNextBooking,
    clearNextBooking,
  } = useReservationStore()

  const table = focusedTableId ? tables.find((t) => t.id === focusedTableId) ?? null : null

  const [showWalkIn, setShowWalkIn] = useState(false)
  const [walkInSize, setWalkInSize] = useState(2)
  const [walkInName, setWalkInName] = useState('')
  const [showMoveSelect, setShowMoveSelect] = useState(false)
  const [showNextBookingSelect, setShowNextBookingSelect] = useState(false)

  // Reset sub-state when focused table changes
  const resetSubState = () => {
    setShowWalkIn(false)
    setWalkInSize(2)
    setWalkInName('')
    setShowMoveSelect(false)
    setShowNextBookingSelect(false)
  }

  useEffect(() => {
    resetSubState()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedTableId])

  const linkedReservation = table?.currentTeam?.reservationId
    ? reservations.find((r) => r.id === table.currentTeam!.reservationId)
    : null

  const waitingReservations = table
    ? reservations.filter((r) => r.status === 'waiting' && r.partySize <= table.seats)
    : []

  const availableForMove = table
    ? [...tables.filter((t) => t.status === 'available' && t.id !== table.id)].sort((a, b) => compareTableLabel(a.label, b.label))
    : []

  const handleWalkIn = () => {
    if (!table) return
    walkInTable(table.id, walkInSize, walkInName.trim() || undefined)
    resetSubState()
  }

  const handleMove = (toTableId: string) => {
    if (!table) return
    moveToTable(table.id, toTableId)
    resetSubState()
  }

  return (
    <aside className="w-[210px] min-w-[210px] h-full bg-surface border-l border-border flex flex-col overflow-y-auto">
      {/* Section 1: Settings (always visible) */}
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center gap-1.5 mb-2">
          <Settings size={12} className="text-charcoal-lighter" />
          <span className="text-[11px] font-semibold text-charcoal-light uppercase tracking-wide">설정</span>
        </div>

        <div className="space-y-1.5">
          <button
            onClick={toggleEditMode}
            className={cn(
              'w-full inline-flex items-center gap-2 px-3 py-2 rounded-xl',
              'text-[11px] font-medium transition-colors',
              isEditMode
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-cream text-charcoal hover:bg-border border border-border'
            )}
          >
            <Pencil size={12} />
            {isEditMode ? '편집 완료' : '배치 편집'}
          </button>

          <button
            onClick={() => {
              if (window.confirm('모든 예약을 초기화하시겠습니까? 테이블 배치는 유지됩니다.')) {
                resetReservations()
              }
            }}
            className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium bg-cream text-charcoal hover:bg-border border border-border transition-colors"
          >
            <RotateCcw size={12} className="text-charcoal-lighter" />
            예약 초기화
          </button>

          <button
            onClick={() => {
              if (window.confirm('설정을 초기화하시겠습니까? 모든 예약과 배치가 삭제됩니다.')) {
                resetSetup()
              }
            }}
            className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium bg-cream text-occupied hover:bg-occupied-light border border-border transition-colors"
          >
            <Trash2 size={12} />
            설정 초기화
          </button>
        </div>
      </div>

      {/* Section 2: TableEditPanel (edit mode) */}
      {isEditMode && (
        <div className="border-t border-border overflow-y-auto flex-1">
          <TableEditPanel />
        </div>
      )}

      {/* Section 2: Table Detail (normal mode) */}
      {!isEditMode && <div className="flex-1 px-3 py-3">
        {!table ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-8">
            <div className="w-10 h-10 rounded-2xl bg-cream flex items-center justify-center">
              <Info size={18} className="text-charcoal-lighter" />
            </div>
            <p className="text-[11px] text-charcoal-lighter leading-relaxed">
              테이블을 클릭하면<br />상세 정보가 표시됩니다
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table header */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-sm font-bold text-charcoal">{table.label}</span>
              <div className="flex items-center gap-1 text-xs text-charcoal-lighter">
                <Users size={12} />
                {table.seats}인석
              </div>
            </div>

            {/* Occupied + reservation linked */}
            {table.status === 'occupied' && linkedReservation && (
              <div className="space-y-2">
                <div className="text-xs space-y-1">
                  <p className="font-medium text-charcoal">
                    {linkedReservation.name}
                    <span className="text-charcoal-lighter ml-1">({linkedReservation.partySize}명)</span>
                  </p>
                  <div className="flex items-center gap-1 text-charcoal-lighter">
                    <Clock size={11} />
                    {linkedReservation.startTime} ~ {linkedReservation.endTime}
                  </div>
                </div>

                {showMoveSelect ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-charcoal-lighter">이동할 테이블:</p>
                    {availableForMove.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {availableForMove.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleMove(t.id)}
                            className="text-[11px] font-medium px-2 py-1 rounded-lg bg-cream hover:bg-primary/10 text-charcoal border border-border hover:border-primary/30 transition-colors"
                          >
                            {t.label} ({t.seats}석)
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-charcoal-lighter">빈 테이블 없음</p>
                    )}
                    <button onClick={() => setShowMoveSelect(false)} className="text-[10px] text-charcoal-lighter hover:text-charcoal">취소</button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setShowMoveSelect(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-xl text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <ArrowRightLeft size={12} />
                      이동
                    </button>
                    <button
                      onClick={() => { clearTable(table.id); resetSubState() }}
                      className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-xl text-occupied bg-occupied-light hover:bg-occupied/20 transition-colors"
                    >
                      <XCircle size={12} />
                      비우기
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Occupied + walk-in (no reservation) */}
            {table.status === 'occupied' && !linkedReservation && (
              <div className="space-y-2">
                <div className="text-xs text-charcoal py-0.5">
                  {table.currentTeam
                    ? <><span className="font-medium">{table.currentTeam.name}</span> <span className="text-charcoal-lighter">({table.currentTeam.partySize}명 · {table.currentTeam.seatedAt}~)</span></>
                    : '사용중'}
                </div>

                {showMoveSelect ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-charcoal-lighter">이동할 테이블:</p>
                    {availableForMove.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {availableForMove.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleMove(t.id)}
                            className="text-[11px] font-medium px-2 py-1 rounded-lg bg-cream hover:bg-primary/10 text-charcoal border border-border hover:border-primary/30 transition-colors"
                          >
                            {t.label} ({t.seats}석)
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-charcoal-lighter">빈 테이블 없음</p>
                    )}
                    <button onClick={() => setShowMoveSelect(false)} className="text-[10px] text-charcoal-lighter hover:text-charcoal">취소</button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setShowMoveSelect(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-xl text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <ArrowRightLeft size={12} />
                      이동
                    </button>
                    <button
                      onClick={() => { clearTable(table.id); resetSubState() }}
                      className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 rounded-xl text-occupied bg-occupied-light hover:bg-occupied/20 transition-colors"
                    >
                      <XCircle size={12} />
                      비우기
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 예약 걸어두기 (occupied) */}
            {table.status === 'occupied' && (
              <div className="border-t border-border pt-2">
                {table.nextBooking ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-charcoal flex items-center gap-1">
                        <CalendarClock size={11} className="text-reserved" />
                        다음 예약
                      </p>
                      <button onClick={() => clearNextBooking(table.id)} className="text-charcoal-lighter hover:text-occupied transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="text-[11px] bg-reserved/10 rounded-lg px-2.5 py-1.5">
                      <p className="font-medium text-charcoal">{table.nextBooking.name} ({table.nextBooking.partySize}명)</p>
                      <p className="text-charcoal-lighter">{table.nextBooking.startTime} ~ {table.nextBooking.endTime}</p>
                      {table.nextBooking.targetLabel && (
                        <p className="text-charcoal-lighter mt-0.5">서브 테이블: {table.nextBooking.targetLabel}</p>
                      )}
                    </div>
                  </div>
                ) : showNextBookingSelect ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-charcoal-lighter">예약 선택:</p>
                    {waitingReservations.length > 0 ? (
                      waitingReservations.slice(0, 5).map((r) => (
                        <button
                          key={r.id}
                          onClick={() => { setNextBooking(table.id, r.id); setShowNextBookingSelect(false) }}
                          className="w-full flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-cream hover:bg-reserved/10 text-charcoal transition-colors"
                        >
                          <span className="font-medium">{r.name}</span>
                          <span className="text-charcoal-lighter flex items-center gap-1">
                            <Users size={10} />{r.partySize}명 · {r.startTime}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="text-[11px] text-charcoal-lighter">대기 중인 예약 없음</p>
                    )}
                    <button onClick={() => setShowNextBookingSelect(false)} className="text-[10px] text-charcoal-lighter hover:text-charcoal">취소</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNextBookingSelect(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 rounded-xl text-reserved bg-reserved/10 hover:bg-reserved/20 transition-colors"
                  >
                    <CalendarClock size={12} />
                    예약 걸어두기
                  </button>
                )}
              </div>
            )}

            {/* Available */}
            {table.status === 'available' && (
              <div className="space-y-2">
                {!showWalkIn ? (
                  <button
                    onClick={() => setShowWalkIn(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors"
                  >
                    <UserPlus size={13} />
                    워크인 배정
                  </button>
                ) : (
                  <div className="space-y-2 bg-cream rounded-xl p-2.5">
                    <p className="text-[11px] font-medium text-charcoal">워크인 배정</p>
                    <input
                      type="text"
                      placeholder="이름 (선택)"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-border text-charcoal placeholder:text-charcoal-lighter focus:outline-none focus:border-primary/50"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-charcoal-light">인원</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setWalkInSize(Math.max(1, walkInSize - 1))}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface border border-border text-charcoal-light hover:border-primary/50 transition-colors"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-bold text-charcoal w-5 text-center">{walkInSize}</span>
                        <button
                          onClick={() => setWalkInSize(Math.min(table.seats, walkInSize + 1))}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface border border-border text-charcoal-light hover:border-primary/50 transition-colors"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setShowWalkIn(false)} className="flex-1 text-[11px] font-medium py-1.5 rounded-lg bg-surface border border-border text-charcoal-light hover:bg-border transition-colors">
                        취소
                      </button>
                      <button onClick={handleWalkIn} className="flex-1 text-[11px] font-medium py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors">
                        배정
                      </button>
                    </div>
                  </div>
                )}

                {waitingReservations.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-charcoal-lighter">예약 배정:</p>
                    {waitingReservations.slice(0, 3).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => { seatReservation(r.id, table.id); resetSubState() }}
                        className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-cream hover:bg-primary/10 text-charcoal transition-colors"
                      >
                        <span className="font-medium">{r.name}</span>
                        <span className="text-charcoal-lighter flex items-center gap-1">
                          <Users size={11} />{r.partySize}명
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {waitingReservations.length === 0 && !showWalkIn && (
                  <div className="flex items-center gap-1.5 text-xs text-charcoal-lighter py-1">
                    <Info size={12} />
                    대기 중인 예약이 없습니다
                  </div>
                )}
              </div>
            )}

            {/* Reserved */}
            {table.status === 'reserved' && linkedReservation && (
              <div className="space-y-2">
                <div className="text-xs space-y-1">
                  <p className="font-medium text-charcoal">
                    {linkedReservation.name}
                    <span className="text-charcoal-lighter ml-1">({linkedReservation.partySize}명)</span>
                  </p>
                  <div className="flex items-center gap-1 text-charcoal-lighter">
                    <Clock size={11} />
                    {linkedReservation.startTime} ~ {linkedReservation.endTime}
                  </div>
                </div>
                <button
                  onClick={() => { seatReservation(linkedReservation.id, table.id); resetSubState() }}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl text-white bg-primary hover:bg-primary-dark transition-colors"
                >
                  <Armchair size={13} />
                  착석 처리
                </button>
              </div>
            )}
          </div>
        )}
      </div>}
    </aside>
  )
}
