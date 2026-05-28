'use client'

/**
 * 인생 분기점 timeline — 대운 전환 + 주요 astro transit milestones.
 * year tier 에서만 사용. age 기반 (한국나이) 다섯 항목 안팎.
 *
 * active 항목은 amber 글로우 dot, 나머지는 zinc 그레이.
 */
import { Compass } from 'lucide-react'
import { getCalLabels, type CalLocale } from '../labels'

export interface TimelineEntry {
  /** "32세" 등 표시 라벨 */
  ageLabel: string
  /** "2027" */
  year: number
  /** 분기점 제목 */
  title: string
  /** 한 줄 설명 */
  description: string
  /** 현재 진행 중 여부 — true 면 amber glow */
  active?: boolean
}

interface Props {
  entries: TimelineEntry[]
  title?: string
  locale?: CalLocale
}

export default function LifeTimeline({ entries, title, locale }: Props) {
  const t = getCalLabels(locale)
  if (entries.length === 0) return null
  const cardTitle = title ?? t.lifeTimelineTitle
  return (
    <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
      <h3 className="text-base font-semibold text-zinc-200 flex items-center gap-2 mb-6 group">
        <Compass className="w-4 h-4 text-amber-400/80 group-hover:text-amber-300 transition" />
        {cardTitle}
      </h3>
      <div className="relative border-l border-zinc-800 ml-3 space-y-7 pb-2">
        {entries.map((item, i) => (
          <div key={`${item.year}-${i}`} className="relative pl-6">
            <div
              className={`absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full border-[3px] border-zinc-950 ${
                item.active ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.55)]' : 'bg-zinc-600'
              }`}
            />
            <div className="flex items-baseline gap-3 flex-wrap mb-1">
              <h4
                className={`text-base font-bold ${
                  item.active ? 'text-amber-400' : 'text-zinc-200'
                }`}
              >
                {item.ageLabel}
                <span className="text-xs font-normal text-zinc-500 ml-1.5">({item.year})</span>
              </h4>
              {item.active && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {t.lifeInProgress}
                </span>
              )}
            </div>
            <h5 className="text-sm text-white font-semibold mb-1.5 leading-snug">{item.title}</h5>
            <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
