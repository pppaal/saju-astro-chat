'use client'

/**
 * Month tier narrative — 엔진 해석 sections(daeun / wolun / pattern / shinsal …)
 * 을 깔끔한 카드 한 개로 보여줌. "총평 해석" 자리.
 *
 * UI 원칙:
 *   - 최대 4 sections (앞쪽 = matcher 우선순위 높음)
 *   - bold 마크다운(**...**) 만 amber strong 으로 인라인 렌더, 나머지는 plain text
 *   - 빈 sections 면 카드 자체 렌더 X (부모가 hero verdict 로 충분)
 */

import { BookOpen } from 'lucide-react'
import type { ImportantDate } from '../../types'
import type { CalLocale } from '../labels'

type Interpretation = NonNullable<ImportantDate['monthlyInterpretation']>

interface Props {
  interp: Interpretation | undefined
  /** "이번 달 해석" 같은 카드 헤더 — 없으면 locale 기본 */
  title?: string
  locale?: CalLocale
}

const MAX_SECTIONS = 4

export default function MonthNarrative({ interp, title, locale }: Props) {
  if (!interp || interp.sections.length === 0) return null
  const cardTitle = title ?? (locale === 'en' ? 'This month, explained' : '이번 달 해석')
  const sections = interp.sections.slice(0, MAX_SECTIONS)

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
      <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2 mb-5">
        <BookOpen className="w-4 h-4 text-amber-400" />
        {cardTitle}
      </h3>
      <div className="space-y-5">
        {sections.map((s, i) => (
          <div key={`${s.section}-${i}`}>
            <h4 className="text-sm font-bold text-amber-300/90 mb-1.5 tracking-wide">{s.title}</h4>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {renderInline(s.text)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function renderInline(text: string) {
  const cleaned = text.trim()
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    const m = part.match(/^\*\*(.+)\*\*$/)
    return m ? (
      <strong key={i} className="text-amber-200 font-semibold">
        {m[1]}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  })
}
