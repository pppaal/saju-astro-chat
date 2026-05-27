'use client'

/**
 * 3 카드 highlight row — best/caution/convergence.
 * year(달) / month(날) / day(시간대) tier 공용.
 *
 * 카드별 톤:
 *   - best: emerald
 *   - caution: rose
 *   - convergence: purple
 *
 * value 가 비어 있으면 그 카드는 placeholder 톤으로 fallback (UI 균형 유지).
 */
import { Star, AlertTriangle, Calendar } from 'lucide-react'

export interface HighlightCard {
  /** 큰 메인 값 — "5월 20일" / "20일" / "오후 3시" 등 */
  value: string
  /** 한 줄 설명 */
  description: string
}

interface Props {
  best?: HighlightCard
  caution?: HighlightCard
  convergence?: HighlightCard
  /** 라벨 — 기본 베스트/주의/수렴, tier에 따라 바꿀 수 있음 */
  bestLabel?: string
  cautionLabel?: string
  convergenceLabel?: string
  /** 각 카드 클릭 핸들 — value 그대로 받음 */
  onBestClick?: () => void
  onCautionClick?: () => void
  onConvergenceClick?: () => void
  /** convergence 자체를 숨김 — day tier 처럼 수렴 source 가 없는 경우 placeholder 카드를 안 그림. */
  hideConvergence?: boolean
}

function Card({
  tone,
  icon,
  label,
  value,
  description,
  onClick,
}: {
  tone: 'emerald' | 'rose' | 'purple'
  icon: React.ReactNode
  label: string
  value?: string
  description?: string
  onClick?: () => void
}) {
  const toneClasses = {
    emerald: {
      bg: 'bg-emerald-900/20',
      border: 'border-emerald-500/25',
      text: 'text-emerald-400',
      sub: 'text-emerald-200/70',
    },
    rose: {
      bg: 'bg-rose-900/20',
      border: 'border-rose-500/25',
      text: 'text-rose-400',
      sub: 'text-rose-200/70',
    },
    purple: {
      bg: 'bg-purple-900/20',
      border: 'border-purple-500/25',
      text: 'text-purple-400',
      sub: 'text-purple-200/70',
    },
  }[tone]

  const empty = !value
  const Wrap = onClick ? 'button' : 'div'
  return (
    <Wrap
      onClick={onClick}
      className={`text-left w-full ${toneClasses.bg} border ${toneClasses.border} rounded-xl p-4 flex flex-col gap-2 ${
        onClick && !empty ? 'hover:brightness-110 transition cursor-pointer' : ''
      }`}
    >
      <div className={`flex items-center gap-2 ${toneClasses.text} text-sm font-semibold`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-black text-white leading-tight">
        {empty ? <span className="text-zinc-600 text-base font-medium">데이터 없음</span> : value}
      </div>
      {description && !empty && (
        <p className={`${toneClasses.sub} text-xs leading-snug`}>{description}</p>
      )}
    </Wrap>
  )
}

export default function Highlights({
  best,
  caution,
  convergence,
  bestLabel = '베스트',
  cautionLabel = '주의',
  convergenceLabel = '양쪽 수렴',
  onBestClick,
  onCautionClick,
  onConvergenceClick,
  hideConvergence = false,
}: Props) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 ${hideConvergence ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}
    >
      <Card
        tone="emerald"
        icon={<Star size={16} />}
        label={bestLabel}
        value={best?.value}
        description={best?.description}
        onClick={onBestClick}
      />
      <Card
        tone="rose"
        icon={<AlertTriangle size={16} />}
        label={cautionLabel}
        value={caution?.value}
        description={caution?.description}
        onClick={onCautionClick}
      />
      {!hideConvergence && (
        <Card
          tone="purple"
          icon={<Calendar size={16} />}
          label={convergenceLabel}
          value={convergence?.value}
          description={convergence?.description}
          onClick={onConvergenceClick}
        />
      )}
    </div>
  )
}
