'use client'

import { CalendarRange, TrendingUp, TrendingDown } from 'lucide-react'
import type { ImportantDate } from './types'
import { computeGradeThresholds, getGrade } from './scoreGrade'

// "양쪽 수렴" = 사주축·점성축이 둘 다 중립(50)에서 이만큼 벗어난 날.
// 점수 *수준 유사*(axisAgreement)가 아니라 양쪽 다 실제 신호가 있는 날 —
// convergence 디라이버(월간/데일리)의 bothSystems와 같은 의미(방향 무관).
const CONVERGENCE_AXIS_MIN = 15

interface Props {
  /** 올해 전체 ImportantDate (calendar-engine 점수 포함) */
  allDates: ImportantDate[]
  /** 표시 연도 */
  year: number
  /** 날짜 클릭 — 'YYYY-MM-DD' 받아 daily 뷰로 점프 */
  onDateClick: (iso: string) => void
  /** 각 방향 표시 개수 (기본 6) */
  topN?: number
  /** 한 달에서 최대 몇 개까지 (군집 방지, 기본 2) */
  perMonthCap?: number
}

/**
 * 올해 큰 날 — 1년 전체에서 점성·사주가 강하게 겹친 날만 추려 보여줌.
 *
 * "오늘 → 이달 → 올해" 줌 단계의 가장 바깥. monthly TOP5(MonthHighlightsCard)를
 * 연 단위로 확장한 것. 데이터는 이미 받은 data.allDates 재활용 (새 API 없음).
 *
 * 큰 날 = getGrade가 좋은 날/조심할 날로 판정한 날 (보통은 제외).
 * 같은 달 군집을 막으려고 한 달 최대 perMonthCap개까지만.
 * "양쪽 수렴" 뱃지 = 두 축이 둘 다 중립에서 벗어난 날 (isConverged).
 *
 * 랭킹/임계값은 d.score(yearlyDates v3, 12달 일관)로만 — displayScore는
 * 현재±3달만 새 엔진 점수로 덮여 있어 연 단위로 섞으면 그 달들이 편향됨.
 */
export default function YearHighlightsCard({
  allDates,
  year,
  onDateClick,
  topN = 6,
  perMonthCap = 2,
}: Props) {
  if (allDates.length === 0) return null

  const thresholds = computeGradeThresholds(allDates.map(pickScore))
  const ranked = allDates
    .map((d) => ({ date: d, score: pickScore(d), grade: getGrade(pickScore(d), thresholds) }))
    .filter((x) => x.grade.key !== 'neutral')

  const lucky = capPerMonth(
    ranked.filter((x) => x.grade.key === 'lucky').sort((a, b) => b.score - a.score),
    perMonthCap
  ).slice(0, topN)

  const unlucky = capPerMonth(
    ranked.filter((x) => x.grade.key === 'unlucky').sort((a, b) => a.score - b.score),
    perMonthCap
  ).slice(0, topN)

  if (lucky.length === 0 && unlucky.length === 0) return null

  return (
    <div className="bg-zinc-900/40 rounded-2xl border border-white/5 shadow-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-1">
        <CalendarRange className="w-5 h-5 text-indigo-400" />
        <h3 className="text-base font-bold text-zinc-200 tracking-wider">{year} 큰 날</h3>
        <span className="text-[11px] text-zinc-500 ml-auto">점성·사주 겹친 날</span>
      </div>

      <div className="p-4 space-y-5">
        {lucky.length > 0 && (
          <Section
            icon={<TrendingUp className="w-4 h-4" />}
            title="올해 좋은 날"
            tone="positive"
            rows={lucky}
            onDateClick={onDateClick}
          />
        )}
        {unlucky.length > 0 && (
          <Section
            icon={<TrendingDown className="w-4 h-4" />}
            title="올해 조심할 날"
            tone="negative"
            rows={unlucky}
            onDateClick={onDateClick}
          />
        )}
      </div>
    </div>
  )
}

interface Row {
  date: ImportantDate
  score: number
  grade: ReturnType<typeof getGrade>
}

function Section({
  icon,
  title,
  tone,
  rows,
  onDateClick,
}: {
  icon: React.ReactNode
  title: string
  tone: 'positive' | 'negative'
  rows: Row[]
  onDateClick: (iso: string) => void
}) {
  const headClass = tone === 'positive' ? 'text-emerald-400' : 'text-rose-400'
  return (
    <div>
      <h4
        className={`text-xs font-bold mb-2 flex items-center gap-1.5 tracking-wider uppercase ${headClass}`}
      >
        {icon}
        {title}
      </h4>
      <div className="space-y-2">
        {rows.map((r) => (
          <DateRow key={r.date.date} row={r} tone={tone} onClick={() => onDateClick(r.date.date)} />
        ))}
      </div>
    </div>
  )
}

function DateRow({
  row,
  tone,
  onClick,
}: {
  row: Row
  tone: 'positive' | 'negative'
  onClick: () => void
}) {
  const { date, grade } = row
  const { month, day, weekday } = parseParts(date.date)
  const reason = pickReason(date, tone)
  const converged = isConverged(date)
  const dayClass = tone === 'positive' ? 'text-emerald-300' : 'text-rose-300'

  return (
    <button
      onClick={onClick}
      className="w-full bg-zinc-950/60 hover:bg-zinc-900 rounded-xl p-3 flex items-center gap-3 text-left transition border border-white/5 hover:border-white/10"
    >
      <div className="flex flex-col items-center justify-center min-w-[3rem] shrink-0 leading-none">
        <span className="text-[10px] text-zinc-500 font-bold">{month}월</span>
        <span className={`text-2xl font-black ${dayClass}`}>{day}</span>
        <span className="text-[10px] text-zinc-600">{weekday}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-sm font-bold ${grade.colorClass} leading-tight`}>
            {grade.label}
          </span>
          {converged && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
              양쪽 수렴
            </span>
          )}
        </div>
        <div className="text-xs text-zinc-400 truncate leading-snug mt-1">{reason}</div>
      </div>
    </button>
  )
}

// 연 단위 일관 점수 — d.score(yearlyDates)만. displayScore는 3달만 덮여
// 있어 cross-year 랭킹에 쓰면 그 달들이 다른 스케일로 섞임.
function pickScore(d: ImportantDate): number {
  return Math.round(d.score ?? 50)
}

// "양쪽 수렴" — 사주축·점성축이 둘 다 중립(50)에서 충분히 벗어남.
// = 양쪽 시스템 모두 그날 실제 신호가 있음 (방향은 무관, convergence와 동일).
function isConverged(d: ImportantDate): boolean {
  const sb = d.scoreBreakdown
  if (!sb) return false
  return (
    Math.abs(sb.sajuAxis - 50) >= CONVERGENCE_AXIS_MIN &&
    Math.abs(sb.astroAxis - 50) >= CONVERGENCE_AXIS_MIN
  )
}

function capPerMonth(rows: Row[], cap: number): Row[] {
  const count = new Map<string, number>()
  const out: Row[] = []
  for (const r of rows) {
    const m = r.date.date.slice(0, 7) // YYYY-MM
    const n = count.get(m) ?? 0
    if (n >= cap) continue
    count.set(m, n + 1)
    out.push(r)
  }
  return out
}

function parseParts(iso: string): { month: number; day: number; weekday: string } {
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10))
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
  return { month: m, day: d, weekday: wd }
}

function pickReason(d: ImportantDate, direction: 'positive' | 'negative'): string {
  if (d.matchedPatterns && d.matchedPatterns.length > 0) {
    return `★ ${d.matchedPatterns[0].name}`
  }
  if (d.engineSignals && d.engineSignals.length > 0) {
    const matchSign = (s: { polarity: number }) =>
      direction === 'positive' ? s.polarity > 0 : s.polarity < 0
    const transient = d.engineSignals.filter(
      (s) => (s.layer === 'daily' || s.layer === 'monthly' || s.layer === 'yearly') && matchSign(s)
    )
    const pool = transient.length > 0 ? transient : d.engineSignals.filter(matchSign)
    if (pool.length > 0) {
      const top = [...pool].sort(
        (a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight
      )[0]
      const arrow = top.polarity > 0 ? '↑' : '↓'
      return `${arrow} ${top.korean ?? top.name}`
    }
  }
  if (d.sajuFactors && d.sajuFactors.length > 0) return d.sajuFactors[0]
  return d.title ?? ''
}
