import { useState, useCallback } from 'react'
import { X, UserPlus, Clock, Users, Phone, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'

export default function NewReservationModal() {
  const { isModalOpen, closeModal, addReservation } = useReservationStore()

  const [name, setName] = useState('')
  const [partySize, setPartySize] = useState('')
  const [time, setTime] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')

  const resetForm = useCallback(() => {
    setName('')
    setPartySize('')
    setTime('')
    setPhone('')
    setNote('')
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !partySize || !time) return

    addReservation({
      name: name.trim(),
      partySize: Number(partySize),
      time,
      phone: phone.trim(),
      ...(note.trim() ? { note: note.trim() } : {}),
    })
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
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
              <UserPlus size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal">새 예약 추가</h2>
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

            {/* 인원 & 시간 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-charcoal mb-1.5">
                  <Users size={14} className="text-charcoal-lighter" />
                  인원 <span className="text-occupied">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                  placeholder="2"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl',
                    'bg-cream border border-border',
                    'text-sm text-charcoal placeholder:text-charcoal-lighter',
                    'focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10',
                    'transition-all'
                  )}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-charcoal mb-1.5">
                  <Clock size={14} className="text-charcoal-lighter" />
                  시간 <span className="text-occupied">*</span>
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl appearance-none',
                    'bg-cream border border-border',
                    'text-sm text-charcoal',
                    !time && 'text-charcoal-lighter',
                    'focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10',
                    'transition-all'
                  )}
                >
                  <option value="">선택</option>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = Math.floor(i / 2) + 11
                    const min = i % 2 === 0 ? '00' : '30'
                    if (hour > 22) return null
                    const val = `${hour}:${min}`
                    return <option key={val} value={val}>{val}</option>
                  })}
                </select>
              </div>
            </div>

            {/* 전화번호 */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-charcoal mb-1.5">
                <Phone size={14} className="text-charcoal-lighter" />
                전화번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
              disabled={!name.trim() || !partySize || !time}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-medium',
                'text-white bg-primary',
                'hover:bg-primary-dark transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              예약 추가
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
