'use client'

import { useState } from 'react'
import { BookOpen, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { ImportantDate } from './types'

type Interpretation = NonNullable<ImportantDate['monthlyInterpretation']>

interface Props {
  interp: Interpretation | undefined
}

/**
 * 월간 narrative 해석 카드.
 *
 * 사용자 피드백("해석이 너무 많아 잘 안 읽힘"):
 *  - 맨 위에 "핵심 포인트" 박스: 첫 2 sections의 첫 문장만 뽑아 강조
 *  - 본문 sections는 기본 접힘 (펼치기 버튼)
 *  - 글자 크기 키움 (text-xs → text-sm, leading-relaxed 유지)
 */
export default function MonthlyInterpretationCard({ interp }: Props) {
  const [expanded, setExpanded] = useState(false)
  if (!interp || interp.sections.length === 0) return null

  const headlineSections = interp.sections.slice(0, 2)
  const headlines = headlineSections
    .map((s) => firstSentence(stripMarkdown(s.text)))
    .filter((line): line is string => Boolean(line && line.length > 8))
    .slice(0, 3)

  return (
    <div className="bg-zinc-900/40 rounded-2xl border border-white/5 shadow-xl p-5 space-y-4">
      <h3 className="text-base font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-indigo-400" />
        이번 달 흐름
      </h3>

      {/* 핵심 포인트 — bullet 형태로 한눈에 */}
      {headlines.length > 0 && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
          <div className="text-xs font-bold text-indigo-300 mb-2 flex items-center gap-1.5 tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            핵심 포인트
          </div>
          <ul className="space-y-1.5">
            {headlines.map((line, i) => (
              <li key={i} className="text-sm text-zinc-200 leading-relaxed flex gap-2">
                <span className="text-indigo-400 shrink-0">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 자세히 보기 토글 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-950/50 hover:bg-zinc-800/70 border border-white/5 text-zinc-300 text-sm font-semibold transition"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            접기
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            자세히 보기
          </>
        )}
      </button>

      {expanded && (
        <div className="space-y-3">
          {interp.sections.map((s) => (
            <div
              key={s.section}
              className="bg-zinc-950/40 rounded-xl p-4 border border-white/5"
            >
              <div className="text-xs font-bold text-indigo-300 mb-2 tracking-wider uppercase">
                {s.title}
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {renderMarkdownBold(s.text)}
              </p>
            </div>
          ))}
        </div>
      )}
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

function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').trim()
}

function firstSentence(text: string): string {
  // 한국어: 마침표/물음표/느낌표 기준, 너무 짧으면 줄바꿈도 fallback
  const m = text.match(/^[^.?!\n]{8,}[.?!]/)
  if (m) return m[0].trim()
  const line = text.split('\n').find((l) => l.trim().length > 8)
  return line ? line.trim() : text.trim()
}
