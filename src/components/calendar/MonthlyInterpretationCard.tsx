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

      {/* 키 이벤트 3 — 베스트 날 / 강한 구간 / 피할 날 (한눈에 스캔) */}
      <KeyEventsBlock keyEvents={interp.keyEvents} />

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
            <div key={s.section} className="bg-zinc-950/40 rounded-xl p-4 border border-white/5">
              <div className="text-xs font-bold text-indigo-300 mb-2 tracking-wider uppercase">
                {s.title}
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {renderMarkdownBold(s.text)}
              </p>
            </div>
          ))}

          {/* Why-card — 테마별 점수 인과 추적 ("왜 그 점수인지") */}
          <WhyCard interp={interp} />
        </div>
      )}
    </div>
  )
}

type KeyEvents = NonNullable<Interpretation['keyEvents']>

/** "MM-DD" → "M월 D일" (앞 0 제거) */
function fmtDate(mmdd: string): string {
  const [m, d] = mmdd.split('-')
  if (!m || !d) return mmdd
  return `${Number(m)}월 ${Number(d)}일`
}

/**
 * 이번 달 키 이벤트 3 카드 — 본문에 흩어진 날짜 정보를 한눈에.
 *  🎯 베스트 날 / 💫 강한 구간 / ⚠️ 피할 날
 */
function KeyEventsBlock({ keyEvents }: { keyEvents: KeyEvents | undefined }) {
  if (!keyEvents) return null
  const { best, window, avoid } = keyEvents
  const hasAvoid = avoid && avoid.dates.length > 0
  if (!best && !window && !hasAvoid) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {best && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-emerald-300 mb-1 flex items-center gap-1 tracking-wide">
            <span aria-hidden>🎯</span> 베스트 날
          </div>
          <div className="text-base font-bold text-zinc-100">{fmtDate(best.date)}</div>
          <div className="text-[11px] text-emerald-200/70 mt-0.5">
            {best.score}점 · 큰 결정·시작에 좋음
          </div>
        </div>
      )}
      {window && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-indigo-300 mb-1 flex items-center gap-1 tracking-wide">
            <span aria-hidden>💫</span> 강한 구간
          </div>
          <div className="text-base font-bold text-zinc-100">
            {fmtDate(window.start)}–{fmtDate(window.end)}
          </div>
          <div className="text-[11px] text-indigo-200/70 mt-0.5">
            평균 {window.avg}점 · 집중 추진
          </div>
        </div>
      )}
      {hasAvoid && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-rose-300 mb-1 flex items-center gap-1 tracking-wide">
            <span aria-hidden>⚠️</span> 피할 날
          </div>
          <div className="text-base font-bold text-zinc-100">
            {avoid.dates.map(fmtDate).join(' · ')}
          </div>
          <div className="text-[11px] text-rose-200/70 mt-0.5">무리한 결정은 미루기</div>
        </div>
      )}
    </div>
  )
}

const THEME_LABEL: Record<string, string> = {
  money: '재물',
  career: '직업',
  love: '연애',
  health: '건강',
  growth: '성장',
}

function WhyCard({ interp }: { interp: Interpretation }) {
  const breakdown = interp.themeBreakdown
  const scores = interp.themeScores
  if (!breakdown) return null
  const themes = (['money', 'career', 'love', 'health', 'growth'] as const).filter(
    (k) => (breakdown[k]?.length ?? 0) > 0
  )
  if (themes.length === 0) return null
  return (
    <div className="bg-zinc-950/40 rounded-xl p-4 border border-white/5">
      <div className="text-xs font-bold text-indigo-300 mb-3 tracking-wider uppercase">
        왜 이 점수인지
      </div>
      <div className="space-y-3">
        {themes.map((k) => (
          <div key={k}>
            <div className="text-sm font-bold text-zinc-200 mb-1">
              {THEME_LABEL[k]} {typeof scores?.[k] === 'number' ? scores[k] : ''}
            </div>
            <ul className="space-y-0.5">
              {breakdown[k]!.map((c, i) => (
                <li key={i} className="text-xs flex items-baseline gap-2 leading-snug">
                  <span
                    className={`shrink-0 font-mono font-bold ${
                      c.dir === 'up' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {c.dir === 'up' ? '+' : '−'}
                    {Math.abs(c.delta)}
                  </span>
                  <span className="text-zinc-400">{c.label}</span>
                </li>
              ))}
            </ul>
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
    )
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
