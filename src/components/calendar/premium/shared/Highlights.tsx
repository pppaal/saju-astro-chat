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
import { getCalLabels, type CalLocale } from '../labels'

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
  /** 라벨 — 미지정 시 locale 기본 (베스트/주의/수렴) */
  bestLabel?: string
  cautionLabel?: string
  convergenceLabel?: string
  /** 각 카드 클릭 핸들 — value 그대로 받음 */
  onBestClick?: () => void
  onCautionClick?: () => void
  onConvergenceClick?: () => void
  /** convergence 자체를 숨김 — day tier 처럼 수렴 source 가 없는 경우 placeholder 카드를 안 그림. */
  hideConvergence?: boolean
  /** UI locale */
  locale?: CalLocale
}

function Card({
  tone,
  icon,
  label,
  value,
  description,
  onClick,
  emptyLabel,
}: {
  tone: 'emerald' | 'rose' | 'purple'
  icon: React.ReactNode
  label: string
  value?: string
  description?: string
  onClick?: () => void
  emptyLabel: string
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
        {empty ? <span className="text-zinc-600 text-base font-medium">{emptyLabel}</span> : value}
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
  bestLabel,
  cautionLabel,
  convergenceLabel,
  onBestClick,
  onCautionClick,
  onConvergenceClick,
  hideConvergence = false,
  locale,
}: Props) {
  const t = getCalLabels(locale)
  return (
    <div
      className={`grid grid-cols-1 gap-3 ${hideConvergence ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}
    >
      <Card
        tone="emerald"
        icon={<Star size={16} />}
        label={bestLabel ?? t.tooltipBest}
        value={best?.value}
        description={best?.description}
        onClick={onBestClick}
        emptyLabel={t.emptyHighlight}
      />
      <Card
        tone="rose"
        icon={<AlertTriangle size={16} />}
        label={cautionLabel ?? t.tooltipCaution}
        value={caution?.value}
        description={caution?.description}
        onClick={onCautionClick}
        emptyLabel={t.emptyHighlight}
      />
      {!hideConvergence && (
        <Card
          tone="purple"
          icon={<Calendar size={16} />}
          label={convergenceLabel ?? t.tooltipConvergence}
          value={convergence?.value}
          description={convergence?.description}
          onClick={onConvergenceClick}
          emptyLabel={t.emptyHighlight}
        />
      )}
    </div>
  )
}
