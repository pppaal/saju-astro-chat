'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Label,
} from 'recharts'
import { CalendarRange, TrendingUp, ChevronDown, ChevronUp, Sparkles, Star } from 'lucide-react'
import type { ImportantDate } from './types'

type YearlyConvergence = NonNullable<ImportantDate['monthlyInterpretation']>['yearlyConvergence']

interface Props {
  allDates: ImportantDate[]
  year: number
  yearlyConvergence?: YearlyConvergence
  onDateClick: (iso: string) => void
}

const THEME_META: Record<string, { label: string; icon: string }> = {
  money: { label: '재물', icon: '💰' },
  career: { label: '직업', icon: '💼' },
  love: { label: '연애', icon: '💗' },
  health: { label: '건강', icon: '🩺' },
  growth: { label: '성장', icon: '🌱' },
}

/**
 * 연간 총평 — 한 해 전체를 한눈에.
 *
 * 데이터 기반(계산값) 우선: 12개월 흐름 그래프 + 강한 영역 + 좋은/조심 달 +
 * 한 줄 결론을 실제 점수에서 뽑는다. "올해 큰 날"은 v2 정밀 연간 수렴
 * (yearlyConvergence — 실제 점성·사주 근거)으로 보여줌. 전통 사주 한 해
 * 흐름(seun)은 계산 점수와 어긋날 수 있어 "전통 해석"으로 접어서 분리 표기.
 */
export default function YearOverviewCard({
  allDates,
  year,
  yearlyConvergence,
  onDateClick,
}: Props) {
  const [showTrad, setShowTrad] = useState(false)

  const monthly = useMemo(() => {
    const buckets: number[][] = Array.from({ length: 12 }, () => [])
    for (const d of allDates) {
      const m = parseInt(d.date.slice(5, 7), 10) - 1
      if (m >= 0 && m < 12) buckets[m].push(d.score ?? 50)
    }
    return buckets.map((arr, i) => ({
      month: `${i + 1}월`,
      monthIdx: i,
      score: arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 50,
      count: arr.length,
    }))
  }, [allDates])

  const themes = useMemo(() => {
    const sum: Record<string, number> = {}
    const cnt: Record<string, number> = {}
    for (const d of allDates) {
      if (!d.themeScores) continue
      for (const [k, v] of Object.entries(d.themeScores)) {
        if (typeof v === 'number') {
          sum[k] = (sum[k] ?? 0) + v
          cnt[k] = (cnt[k] ?? 0) + 1
        }
      }
    }
    return (['money', 'career', 'love', 'health', 'growth'] as const)
      .map((k) => ({ key: k, avg: cnt[k] ? Math.round(sum[k] / cnt[k]) : 50 }))
      .sort((a, b) => b.avg - a.avg)
  }, [allDates])

  const seunText = useMemo(() => {
    for (const d of allDates) {
      const sec = d.monthlyInterpretation?.sections?.find((s) => s.section === 'seun')
      if (sec?.text) return sec.text.replace(/\*\*(.+?)\*\*/g, '$1').trim()
    }
    return null
  }, [allDates])

  const withData = monthly.filter((m) => m.count > 0)
  if (withData.length === 0) return null

  const best = [...withData].sort((a, b) => b.score - a.score)
  const worst = [...withData].sort((a, b) => a.score - b.score)
  const bestMonth = best[0]
  const worstMonth = worst[0]
  const verdict =
    bestMonth && worstMonth && bestMonth.monthIdx !== worstMonth.monthIdx
      ? `${bestMonth.monthIdx + 1}월 무렵 흐름이 가장 좋고, ${worstMonth.monthIdx + 1}월은 숨 고르기 좋은 시기예요.`
      : '한 해 흐름이 비교적 고른 편이에요.'

  const goodMonths = best.slice(0, 2).map((m) => m.monthIdx + 1)
  const cautionMonths = worst.slice(0, 2).map((m) => m.monthIdx + 1)

  const keyDays = (yearlyConvergence?.keyDays ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-6">
      {/* ── 연간 총평 ── */}
      <div className="bg-gradient-to-br from-indigo-950/50 to-zinc-900/40 rounded-2xl border border-indigo-500/20 shadow-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-indigo-300" />
          <h3 className="text-lg font-black text-zinc-50">{year} 한 해 흐름</h3>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed">{verdict}</p>

        {/* 12개월 흐름 그래프 */}
        <div>
          <div className="text-[11px] font-bold text-indigo-300 tracking-wide mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> 월별 흐름
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={monthly} margin={{ top: 8, right: 36, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="yearFlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#a1a1aa" fontSize={11} interval={1} />
              <YAxis domain={[0, 100]} stroke="#a1a1aa" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: '#09090b',
                  border: '1px solid #3f3f46',
                  borderRadius: '0.5rem',
                  fontSize: '13px',
                  padding: '6px 10px',
                }}
                labelStyle={{ color: '#e4e4e7', fontWeight: 700 }}
                formatter={(v) => [`${v}점`, '월 평균']}
              />
              <ReferenceLine y={50} stroke="#71717a" strokeWidth={1.2} strokeDasharray="4 4">
                <Label value="보통 50" position="right" fill="#a1a1aa" fontSize={10} />
              </ReferenceLine>
              <Area
                type="monotone"
                dataKey="score"
                stroke="#a5b4fc"
                strokeWidth={2.5}
                fill="url(#yearFlow)"
                dot={{ r: 3.5, fill: '#a5b4fc', stroke: '#0a0f1e', strokeWidth: 1.5 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[12px]">
            <span className="text-emerald-300">
              <span aria-hidden>🟢</span> 좋은 달 {goodMonths.join('·')}월
            </span>
            <span className="text-rose-300">
              <span aria-hidden>🔴</span> 조심할 달 {cautionMonths.join('·')}월
            </span>
          </div>
        </div>

        {/* 올해 강한 영역 */}
        <div>
          <div className="text-[11px] font-bold text-indigo-300 tracking-wide mb-2">
            올해 강한 영역
          </div>
          <div className="space-y-1.5">
            {themes.map((t) => (
              <div key={t.key} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-sm text-zinc-200">
                  <span aria-hidden className="mr-1">
                    {THEME_META[t.key].icon}
                  </span>
                  {THEME_META[t.key].label}
                </span>
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    style={{ width: `${Math.max(4, Math.min(100, t.avg))}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-bold text-zinc-400">
                  {t.avg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 올해 큰 날 (v2 정밀 — 실제 점성·사주 근거) ──
          로딩 중/실패면 이 블록은 숨고 부모의 YearHighlightsCard 폴백이 대신 뜸. */}
      {keyDays.length > 0 && (
        <div className="bg-zinc-900/40 rounded-2xl border border-white/5 shadow-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-amber-300" />
            <h3 className="text-base font-bold text-zinc-200 tracking-wider">올해 큰 날</h3>
            <span className="text-[11px] text-zinc-500 ml-auto">점성·사주 겹친 날</span>
          </div>
          <ul className="space-y-2.5 mt-2">
            {keyDays.map((d) => (
              <li key={d.date}>
                <button
                  onClick={() => onDateClick(d.date)}
                  className="w-full text-left bg-zinc-950/60 hover:bg-zinc-900 rounded-xl p-3 border border-white/5 hover:border-white/10 transition flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-100">{fmtFull(d.date)}</span>
                    {d.bothSystems && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                        양쪽 수렴
                      </span>
                    )}
                  </div>
                  {d.astro.length > 0 && (
                    <div className="text-[11px] leading-snug flex gap-1.5">
                      <span className="shrink-0 font-bold text-sky-300/90">점성</span>
                      <span className="text-zinc-400">{d.astro.join(' · ')}</span>
                    </div>
                  )}
                  {d.saju.length > 0 && (
                    <div className="text-[11px] leading-snug flex gap-1.5">
                      <span className="shrink-0 font-bold text-amber-300/90">사주</span>
                      <span className="text-zinc-400">{d.saju.join(' · ')}</span>
                    </div>
                  )}
                  {d.meaning && (
                    <div className="text-[11px] leading-snug text-indigo-300/80 italic">
                      {d.meaning}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 전통 사주 한 해 흐름 (계산 점수와 다를 수 있어 분리) ── */}
      {seunText && (
        <div className="bg-zinc-900/30 rounded-2xl border border-white/5">
          <button
            onClick={() => setShowTrad((v) => !v)}
            className="w-full flex items-center gap-2 px-5 py-3 text-zinc-300 text-sm font-semibold"
          >
            <Sparkles className="w-4 h-4 text-amber-300/80" />
            전통 사주 한 해 흐름
            <span className="text-[11px] text-zinc-500 font-normal">
              위 월별 흐름과 다를 수 있어요
            </span>
            {showTrad ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>
          {showTrad && (
            <p className="px-5 pb-5 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {seunText}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function fmtFull(iso: string): string {
  const [, m, d] = iso.split('-')
  if (!m || !d) return iso
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(iso + 'T00:00:00').getDay()]
  return `${Number(m)}월 ${Number(d)}일 (${wd})`
}
