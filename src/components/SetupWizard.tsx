import { MapPin, Plus, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReservationStore } from '@/store/useReservationStore'
import EditableTable from './EditableTable'
import TableEditPanel from './TableEditPanel'

export default function SetupWizard() {
  const { tables, completeSetup, selectTable } = useReservationStore()

  const handleCanvasClick = () => {
    selectTable(null)
  }

  return (
    <div className="flex h-screen w-screen bg-cream">
      {/* 왼쪽: 안내 패널 */}
      <div className="w-[360px] flex flex-col bg-surface border-r border-border">
        {/* 로고 & 타이틀 */}
        <div className="px-8 pt-10 pb-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full mb-6">
            <MapPin size={14} />
            <span className="text-xs font-semibold">CozyTable</span>
          </div>
          <h1 className="text-2xl font-bold text-charcoal leading-snug">
            식당 테이블 배치를
            <br />
            설정해주세요
          </h1>
          <p className="text-sm text-charcoal-light mt-3 leading-relaxed">
            실제 식당 구조에 맞게 테이블을 배치하세요.
            <br />
            나중에 언제든지 수정할 수 있습니다.
          </p>
        </div>

        {/* 가이드 스텝 */}
        <div className="px-8 flex-1">
          <div className="space-y-4">
            <StepItem
              number={1}
              title="테이블 추가"
              description="오른쪽 패널에서 테이블을 추가하세요"
            />
            <StepItem
              number={2}
              title="위치 조정"
              description="테이블을 드래그하여 원하는 위치로 이동하세요"
            />
            <StepItem
              number={3}
              title="속성 설정"
              description="테이블을 클릭하여 이름, 좌석 수 등을 설정하세요"
            />
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="px-8 py-6 border-t border-border">
          <button
            onClick={completeSetup}
            disabled={tables.length === 0}
            className={cn(
              'w-full inline-flex items-center justify-center gap-2',
              'text-sm font-semibold py-3 rounded-2xl',
              'transition-all duration-200',
              tables.length > 0
                ? 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30'
                : 'bg-border text-charcoal-lighter cursor-not-allowed'
            )}
          >
            설정 완료
            <ArrowRight size={16} />
          </button>
          {tables.length === 0 && (
            <p className="text-[11px] text-charcoal-lighter text-center mt-2">
              최소 1개의 테이블을 추가해주세요
            </p>
          )}
          {tables.length > 0 && (
            <p className="text-[11px] text-charcoal-lighter text-center mt-2">
              {tables.length}개의 테이블이 설정되었습니다
            </p>
          )}
        </div>
      </div>

      {/* 오른쪽: 캔버스 + 편집 패널 */}
      <div className="flex-1 h-full flex flex-col">
        {/* 상단 바 */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface/60 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-charcoal">플로어 맵</h2>
            <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              초기 설정
            </span>
          </div>
        </div>

        {/* 캔버스 */}
        <div className="flex-1 relative overflow-auto p-6">
          <div
            onClick={handleCanvasClick}
            className="relative bg-surface rounded-3xl border border-primary/20 border-dashed shadow-sm"
            style={{ width: 700, height: 900 }}
          >
            {/* Grid dots pattern */}
            <div
              className="absolute inset-0 rounded-3xl opacity-[0.15]"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #c4b8a8 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* 빈 상태 안내 */}
            {tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus size={28} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium text-charcoal-light">
                    오른쪽 패널에서 테이블을 추가하세요
                  </p>
                  <p className="text-xs text-charcoal-lighter mt-1">
                    추가 후 드래그로 위치를 조정하세요
                  </p>
                </div>
              </div>
            )}

            {/* 테이블 렌더링 */}
            {tables.map((table) => (
              <EditableTable key={table.id} table={table} />
            ))}
          </div>

          {/* 편집 패널 */}
          <TableEditPanel />
        </div>
      </div>
    </div>
  )
}

function StepItem({
  number,
  title,
  description,
}: {
  number: number
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="text-sm font-semibold text-charcoal">{title}</p>
        <p className="text-xs text-charcoal-light mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
}
