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
import {
  CalendarRange,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import type { ImportantDate } from './types'
import type { YearMonthly } from './DestinyMatrixPlanner'
import { getGrade } from './scoreGrade'

interface Props {
  year: number
  allDates: ImportantDate[]
  /** 월별 요약(v2) — 월 뷰와 동일 엔진. 없으면(로딩 전) 렌더 안 함(부모가 폴백). */
  yearlyMonthly?: YearMonthly[]
  /** 달 클릭 → 그 달 monthly 뷰로 (0-indexed month) */
  onMonthClick: (monthIdx: number) => void
}

const THEME_META: Record<string, { label: string; icon: string }> = {
  money: { label: '재물', icon: '💰' },
  career: { label: '직업', icon: '💼' },
  love: { label: '연애', icon: '💗' },
  health: { label: '건강', icon: '🩺' },
  growth: { label: '성장', icon: '🌱' },
}

// 절대 cutoff(57/43) — yearlyDates.scoreToGrade와 같은 임계라 yearly band 라벨이
// daily grade와 일관. 이전 분포 percentile 기반은 daily/yearly가 같은 점수에
// 다른 라벨을 매겨 카드 안 모순을 만들었기에 폐기.
function band(score: number): { label: string; color: string } {
  const g = getGrade(score)
  if (g.key === 'lucky') return { label: '좋음', color: 'text-emerald-300' }
  if (g.key === 'unlucky') return { label: '조심', color: 'text-rose-300' }
  return { label: '보통', color: 'text-zinc-300' }
}

const BAND_DESC: Record<string, string> = {
  좋음: '전반적으로 잘 풀리는 달',
  보통: '무난하게 흐르는 달',
  조심: '한 박자 쉬어가는 달',
}

/**
 * 연간 총평 — 한 해를 "달 단위 + 이유"로. 모든 점수는 월 뷰와 동일한 v2 엔진
 * (yearlyMonthly)에서 와서 일관된다. 일(day) 단위로 쪼개지 않고 월까지만.
 * 전통 사주 한 해 흐름(seun)은 계산 점수와 어긋날 수 있어 접어서 분리 표기.
 */
export default function YearOverviewCard({ year, allDates, yearlyMonthly, onMonthClick }: Props) {
  const [showTrad, setShowTrad] = useState(false)

  const seunText = useMemo(() => {
    for (const d of allDates) {
      const sec = d.monthlyInterpretation?.sections?.find((s) => s.section === 'seun')
      if (sec?.text) return sec.text.replace(/\*\*(.+?)\*\*/g, '$1').trim()
    }
    return null
  }, [allDates])

  const yearThemes = useMemo(() => {
    const sum: Record<string, number> = {}
    const cnt: Record<string, number> = {}
    for (const m of yearlyMonthly ?? []) {
      for (const t of m.themes) {
        sum[t.theme] = (sum[t.theme] ?? 0) + t.score
        cnt[t.theme] = (cnt[t.theme] ?? 0) + 1
      }
    }
    return (['money', 'career', 'love', 'health', 'growth'] as const)
      .map((k) => ({ key: k, avg: cnt[k] ? Math.round(sum[k] / cnt[k]) : 50 }))
      .sort((a, b) => b.avg - a.avg)
  }, [yearlyMonthly])

  if (!yearlyMonthly || yearlyMonthly.length === 0) return null

  const chartData = yearlyMonthly.map((m) => ({ month: `${m.month}월`, score: m.score }))
  // Y축 사용자 범위에 맞춰 stretch — 모든 사용자 점수가 ~50 근처에 몰리는 분포
  // 특성상 0~100 고정이면 굴곡이 거의 안 보인다. 실제 min/max ±5 padding으로 줌인.
  const yMin = Math.max(0, Math.floor(Math.min(...chartData.map((d) => d.score)) / 5) * 5 - 5)
  const yMax = Math.min(100, Math.ceil(Math.max(...chartData.map((d) => d.score)) / 5) * 5 + 5)
  const showNeutral50 = yMin <= 50 && yMax >= 50
  // 현재 위치 세로 가이드 — viewYear가 올해와 같을 때만 표시. recharts ReferenceLine은
  // category XAxis에서 x dataKey 값과 정확히 일치해야 그려진다.
  const today = new Date()
  const nowMonthLabel = today.getFullYear() === year ? `${today.getMonth() + 1}월` : null
  const sortedByScore = [...yearlyMonthly].sort((a, b) => b.score - a.score)
  const bestM = sortedByScore[0]
  const worstM = sortedByScore[sortedByScore.length - 1]
  const verdict =
    bestM && worstM && bestM.month !== worstM.month
      ? `${bestM.month}월 무렵 흐름이 가장 좋고, ${worstM.month}월은 숨 고르기 좋은 시기예요.`
      : '한 해 흐름이 비교적 고른 편이에요.'

  return (
    <div className="space-y-6">
      {/* ── 연간 총평 ── */}
      <div className="bg-gradient-to-br from-indigo-950/50 to-zinc-900/40 rounded-2xl border border-indigo-500/20 shadow-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-indigo-300" />
          <h3 className="text-lg font-black text-zinc-50">{year} 한 해 흐름</h3>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed">{verdict}</p>

        <div>
          <div className="text-[11px] font-bold text-indigo-300 tracking-wide mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> 월별 흐름
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={chartData} margin={{ top: 14, right: 36, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="yearFlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#a1a1aa" fontSize={11} interval={1} />
              <YAxis domain={[yMin, yMax]} stroke="#a1a1aa" fontSize={11} />
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
              {showNeutral50 && (
                <ReferenceLine y={50} stroke="#71717a" strokeWidth={1.2} strokeDasharray="4 4">
                  <Label value="보통 50" position="right" fill="#a1a1aa" fontSize={10} />
                </ReferenceLine>
              )}
              {nowMonthLabel && (
                <ReferenceLine
                  x={nowMonthLabel}
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                >
                  <Label
                    value="지금"
                    position="insideTop"
                    offset={8}
                    fill="#fbbf24"
                    fontSize={10}
                    fontWeight={700}
                  />
                </ReferenceLine>
              )}
              <Area
                type="natural"
                dataKey="score"
                stroke="#a5b4fc"
                strokeWidth={2.5}
                fill="url(#yearFlow)"
                dot={false}
                activeDot={{ r: 5, fill: '#a5b4fc', stroke: '#0a0f1e', strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          {/* 좋은 달/조심할 달 chip 라인은 아래 "월별 핵심" 리스트와 같은 정보를
              두 번 노출이라 제거 — 리스트가 점수·테마·클릭 네비까지 가져 더 풍부. */}
        </div>

        <div>
          <div className="text-[11px] font-bold text-indigo-300 tracking-wide mb-2">
            올해 강한 영역
          </div>
          <div className="space-y-1.5">
            {yearThemes.map((t) => (
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

      {/* ── 월별 핵심 — 좋은 달 TOP 3 + 조심할 달 TOP 3 (12개 풀 리스트 → 6개 요약) ── */}
      <div className="bg-zinc-900/40 rounded-2xl border border-white/5 shadow-xl p-5">
        <h3 className="text-base font-bold text-zinc-200 tracking-wider mb-1">월별 핵심</h3>
        <p className="text-xs text-zinc-500 mb-3">달을 누르면 그 달 상세로 이동해요</p>
        <ul className="space-y-2">
          {[...sortedByScore.slice(0, 3), ...sortedByScore.slice(-3).reverse()].map((m) => {
            const b = band(m.score)
            const strong = m.themes.slice(0, 2)
            return (
              <li key={m.month}>
                <button
                  onClick={() => onMonthClick(m.month - 1)}
                  className="w-full text-left bg-zinc-950/60 hover:bg-zinc-900 rounded-xl p-3 border border-white/5 hover:border-white/10 transition flex items-center gap-3"
                >
                  <div className="flex flex-col items-center justify-center w-11 shrink-0 leading-none">
                    <span className="text-xl font-black text-zinc-100">{m.month}</span>
                    <span className="text-[10px] text-zinc-500">월</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${b.color}`}>{b.label}</span>
                      {strong.map((t) => (
                        <span
                          key={t.theme}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-200 font-bold"
                        >
                          {THEME_META[t.theme]?.icon} {THEME_META[t.theme]?.label}
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-snug mt-1">
                      {BAND_DESC[b.label]}
                      {strong.length > 0 && (
                        <>
                          {' · '}
                          {strong.map((t) => THEME_META[t.theme]?.label).join('·')} 강세
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

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
