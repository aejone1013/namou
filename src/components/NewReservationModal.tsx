import { useState, useCallback, useEffect } from 'react'
import { X, UserPlus, Clock, Users, Phone, MessageSquare, Minus, Plus, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import { getStartTimeOptions, getFixedEndTime, formatFrenchPhone, timeToMinutes } from '@/data/dummy'

export default function NewReservationModal() {
  const { isModalOpen, closeModal, addReservation, editingReservation, updateReservation, reservations } = useReservationStore()

  const [name, setName] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [period, setPeriod] = useState<'lunch' | 'dinner'>('lunch')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')

  const isEditing = !!editingReservation

  const startTimeOptions = getStartTimeOptions(period)

  // 편집 모드일 때 기존 값 로드
  useEffect(() => {
    if (editingReservation) {
      setName(editingReservation.name)
      setPartySize(editingReservation.partySize)
      setPeriod(editingReservation.period)
      setStartTime(editingReservation.startTime)
      setEndTime(editingReservation.endTime)
      setPhone(editingReservation.phone)
      setNote(editingReservation.note || '')
    }
  }, [editingReservation])

  // period 변경 시 시간 초기화
  const handlePeriodChange = (newPeriod: 'lunch' | 'dinner') => {
    setPeriod(newPeriod)
    setStartTime('')
    setEndTime('')
  }

  // startTime 변경 시 endTime 자동 계산 (1시간 30분 고정)
  const handleStartTimeChange = (val: string) => {
    setStartTime(val)
    if (val) {
      setEndTime(getFixedEndTime(val))
    } else {
      setEndTime('')
    }
  }

  // 전화번호 포맷
  const handlePhoneChange = (val: string) => {
    // +나 숫자만 허용, 최대 13자리 (+33 포함)
    const cleaned = val.replace(/[^\d+]/g, '').slice(0, 13)
    setPhone(formatFrenchPhone(cleaned))
  }

  const resetForm = useCallback(() => {
    setName('')
    setPartySize(2)
    setPeriod('lunch')
    setStartTime('')
    setEndTime('')
    setPhone('')
    setNote('')
  }, [])

  const hasDuplicate = (): boolean => {
    const newStart = timeToMinutes(startTime)
    const newEnd = timeToMinutes(endTime)
    const trimmedName = name.trim().toLowerCase()
    return reservations.some((r) => {
      if (isEditing && editingReservation && r.id === editingReservation.id) return false
      if (r.status === 'completed') return false
      if (r.name.toLowerCase() !== trimmedName) return false
      const rStart = timeToMinutes(r.startTime)
      const rEnd = timeToMinutes(r.endTime)
      return newStart < rEnd && newEnd > rStart
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !partySize || !startTime || !endTime) return

    if (hasDuplicate()) {
      if (!window.confirm(`'${name.trim()}' 이름으로 같은 시간대에 이미 예약이 있습니다. 그래도 추가하시겠습니까?`)) {
        return
      }
    }

    if (isEditing && editingReservation) {
      updateReservation(editingReservation.id, {
        name: name.trim(),
        partySize,
        period,
        startTime,
        endTime,
        phone: phone.trim(),
        ...(note.trim() ? { note: note.trim() } : { note: undefined }),
      })
    } else {
      addReservation({
        name: name.trim(),
        partySize,
        period,
        startTime,
        endTime,
        phone: phone.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
    }
    resetForm()
  }

  const handleClose = () => {
    closeModal()
    resetForm()
  }

  if (!isModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-charcoal/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 모달 */}
      <div
        className={cn(
          'relative w-[440px] bg-surface rounded-3xl shadow-2xl shadow-charcoal/10',
          'border border-border',
          'animate-in zoom-in-95'
        )}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
              <UserPlus size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal">
                {isEditing ? '예약 수정' : '새 예약 추가'}
              </h2>
              <p className="text-xs text-charcoal-lighter">
                예약 정보를 입력해주세요
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-xl',
              'text-charcoal-lighter hover:text-charcoal',
              'hover:bg-cream transition-colors'
            )}
          >
            <X size={18} />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-4">
            {/* 이름 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-charcoal mb-1.5">
                <Users size={14} className="text-charcoal-lighter" />
                예약자 이름 <span className="text-occupied">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl',
                  'bg-cream border border-border',
                  'text-sm text-charcoal placeholder:text-charcoal-lighter',
                  'focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10',
                  'transition-all'
                )}
                autoFocus
              />
            </div>

            {/* 인원 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-charcoal mb-1.5">
                <Users size={14} className="text-charcoal-lighter" />
                인원 <span className="text-occupied">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPartySize(Math.max(1, partySize - 1))}
                  className={cn(
                    'w-12 h-12 flex items-center justify-center rounded-xl',
                    'bg-cream border border-border',
                    'text-charcoal hover:bg-border hover:text-charcoal',
                    'transition-colors',
                    'active:scale-95'
                  )}
                >
                  <Minus size={20} />
                </button>
                <span className="flex-1 text-center text-lg font-bold text-charcoal">
                  {partySize}
                </span>
                <button
                  type="button"
                  onClick={() => setPartySize(Math.min(20, partySize + 1))}
                  className={cn(
                    'w-12 h-12 flex items-center justify-center rounded-xl',
                    'bg-cream border border-border',
                    'text-charcoal hover:bg-border hover:text-charcoal',
                    'transition-colors',
                    'active:scale-95'
                  )}
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* 점심/저녁 선택 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-charcoal mb-1.5">
                <Clock size={14} className="text-charcoal-lighter" />
                시간대 <span className="text-occupied">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePeriodChange('lunch')}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2',
                    'py-2.5 rounded-xl text-sm font-medium',
                    'transition-all border',
                    period === 'lunch'
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-cream border-border text-charcoal-light hover:bg-border'
                  )}
                >
                  <Sun size={16} />
                  점심 (12:00~14:00)
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange('dinner')}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2',
                    'py-2.5 rounded-xl text-sm font-medium',
                    'transition-all border',
                    period === 'dinner'
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-cream border-border text-charcoal-light hover:bg-border'
                  )}
                >
                  <Moon size={16} />
                  저녁 (19:00~21:30)
                </button>
              </div>
            </div>

            {/* 시작 시간 → 종료 시간 자동 계산 */}
            <div>
              <label className="text-xs font-medium text-charcoal-light mb-1 block">
                시작 시간 <span className="text-occupied">*</span>
                <span className="text-charcoal-lighter ml-1">(1시간 30분 자동 배정)</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl appearance-none',
                    'bg-cream border border-border',
                    'text-sm text-charcoal',
                    !startTime && 'text-charcoal-lighter',
                    'focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10',
                    'transition-all'
                  )}
                >
                  <option value="">시작 시간</option>
                  {startTimeOptions.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
                <span className="text-charcoal-lighter text-sm">~</span>
                <div className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl',
                  'bg-cream/50 border border-border',
                  'text-sm',
                  endTime ? 'text-charcoal font-medium' : 'text-charcoal-lighter'
                )}>
                  {endTime || '종료 시간'}
                </div>
              </div>
            </div>

            {/* 전화번호 - 프랑스 포맷 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-charcoal mb-1.5">
                <Phone size={14} className="text-charcoal-lighter" />
                전화번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="06 12 34 56 78"
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl',
                  'bg-cream border border-border',
                  'text-sm text-charcoal placeholder:text-charcoal-lighter',
                  'focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10',
                  'transition-all'
                )}
              />
            </div>

            {/* 메모 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-charcoal mb-1.5">
                <MessageSquare size={14} className="text-charcoal-lighter" />
                메모
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="특이사항이 있으면 입력하세요"
                rows={2}
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl resize-none',
                  'bg-cream border border-border',
                  'text-sm text-charcoal placeholder:text-charcoal-lighter',
                  'focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10',
                  'transition-all'
                )}
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-medium',
                'text-charcoal-light bg-cream',
                'hover:bg-border transition-colors'
              )}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !partySize || !startTime || !endTime}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-medium',
                'text-white bg-primary',
                'hover:bg-primary-dark transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {isEditing ? '수정' : '예약 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
