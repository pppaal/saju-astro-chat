'use client'

import { BookOpen } from 'lucide-react'
import type { ImportantDate } from './types'

type Interpretation = NonNullable<ImportantDate['monthlyInterpretation']>

interface Props {
  interp: Interpretation | undefined
}

/**
 * 월간 narrative 해석 카드.
 * calendar-engine의 buildInterpretation() 출력을 section별로 렌더.
 *
 * 각 section:
 *  - 큰 흐름 (대운/세운/월운/트랜짓)
 *  - 매칭 패턴 요약
 *  - 테마별 영역 (재물·연애·직업)
 *  - 신살
 *
 * interp 없거나 sections 비어있으면 렌더 안 함.
 */
export default function MonthlyInterpretationCard({ interp }: Props) {
  if (!interp || interp.sections.length === 0) return null

  return (
    <div className="bg-zinc-900/40 rounded-2xl border border-white/5 shadow-xl p-5 space-y-3">
      <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-indigo-400" />
        명리·점성 해석
      </h3>

      <div className="space-y-2.5">
        {interp.sections.map((s) => (
          <div
            key={s.section}
            className="bg-zinc-950/40 rounded-xl p-3 border border-white/5"
          >
            <div className="text-[11px] font-bold text-indigo-300 mb-1.5 tracking-wide">
              {s.title}
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {/* **굵게** 마크다운만 처리 */}
              {renderMarkdownBold(s.text)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** **text** → <strong>text</strong> 변환 (간단 inline) */
function renderMarkdownBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-amber-300 font-bold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
