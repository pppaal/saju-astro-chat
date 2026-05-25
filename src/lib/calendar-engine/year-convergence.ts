import { buildCalendar } from './index'
import { deriveConvergence, type Convergence } from './derivers/convergence'
import type { NatalContext } from './context/types'
import type { CalendarCell } from './types'

/**
 * 연간 인사이트 — 그 해 1년 전체를 한 번 v2 빌드하고
 *  (1) 수렴 "큰 날"(convergence)과
 *  (2) 월별 요약(monthly: 점수·강한 영역·이유)을 함께 뽑는다.
 *
 * 1년 365일 v2 빌드라 비싸다(~1.7s). 같은 본명·연도면 결과가 동일하므로 프로세스
 * 인메모리 캐시로 1회만 빌드한다(DB 불필요). 월별 점수는 메인 월 뷰와 같은 v2
 * derivedScore 라서 "yearly 흐름"과 "월 뷰"가 일관된다(이전엔 yearly가 v3, 월 뷰가
 * v2라 같은 달이 다르게 보였음).
 */

const CACHE_CAP = 200

export interface YearMonthSummary {
  /** 1~12 */
  month: number
  /** 그 달 v2 derivedScore 평균 (월 뷰와 동일 엔진) */
  score: number
  /** 영역별 월 평균 themeScore (점수 내림차순) */
  themes: Array<{ theme: 'love' | 'money' | 'career' | 'health' | 'growth'; score: number }>
  tone: 'up' | 'down' | 'flat'
}

/** 일별 v2 점수 — 달력 grid·월 점수가 yearly 흐름과 같은 엔진을 쓰도록 백필용. */
export interface YearDailyScore {
  /** YYYY-MM-DD */
  date: string
  /** 그 날 v2 derivedScore (월 뷰·grid와 동일 엔진) */
  score: number
}

export interface YearInsights {
  convergence: Convergence
  monthly: YearMonthSummary[]
  /** 365일 일별 v2 점수 — 클라가 모든 날짜 displayScore 백필에 사용. */
  daily: YearDailyScore[]
}

const insightsCache = new Map<string, YearInsights>()

function aggregateMonthly(cells: CalendarCell[]): YearMonthSummary[] {
  type Acc = { scores: number[]; theme: Record<string, number[]> }
  const byMonth: Acc[] = Array.from({ length: 12 }, () => ({ scores: [], theme: {} }))

  for (const c of cells) {
    const m = new Date(c.datetime).getUTCMonth()
    const acc = byMonth[m]
    if (!acc) continue
    acc.scores.push(c.derivedScore)
    for (const [k, v] of Object.entries(c.themeScores)) {
      if (typeof v === 'number') (acc.theme[k] ??= []).push(v)
    }
  }

  return byMonth.map((acc, i) => {
    const score = acc.scores.length
      ? Math.round(acc.scores.reduce((a, x) => a + x, 0) / acc.scores.length)
      : 50
    const themes = (Object.entries(acc.theme) as Array<[string, number[]]>)
      .map(([k, arr]) => ({
        theme: k as YearMonthSummary['themes'][number]['theme'],
        score: Math.round(arr.reduce((a, x) => a + x, 0) / arr.length),
      }))
      .sort((a, b) => b.score - a.score)
    const tone: YearMonthSummary['tone'] = score >= 58 ? 'up' : score <= 43 ? 'down' : 'flat'
    return { month: i + 1, score, themes, tone }
  })
}

export async function getYearInsights(args: {
  birthKey: string
  year: number
  natal: NatalContext
  topN?: number
  lang?: 'ko' | 'en'
}): Promise<YearInsights> {
  const { birthKey, year, natal, topN = 8, lang = 'ko' } = args
  const key = `${birthKey}|${year}|${lang}`
  const cached = insightsCache.get(key)
  if (cached) return cached

  const cells = await buildCalendar(
    natal,
    {
      start: `${year}-01-01T00:00:00.000Z`,
      end: `${year}-12-31T23:59:59.999Z`,
      granularity: 'day',
    },
    { includeEvidence: true }
  )
  const convergence = deriveConvergence(cells, topN, lang)
  const monthly = aggregateMonthly(cells)
  const daily: YearDailyScore[] = cells.map((c) => ({
    date: c.datetime.slice(0, 10),
    score: Math.round(c.derivedScore),
  }))
  const insights: YearInsights = { convergence, monthly, daily }

  if (insightsCache.size >= CACHE_CAP) {
    const oldest = insightsCache.keys().next().value
    if (oldest !== undefined) insightsCache.delete(oldest)
  }
  insightsCache.set(key, insights)
  return insights
}

/** 하위호환 — convergence 만 필요할 때. */
export async function getYearConvergence(args: {
  birthKey: string
  year: number
  natal: NatalContext
  topN?: number
  lang?: 'ko' | 'en'
}): Promise<Convergence> {
  return (await getYearInsights(args)).convergence
}
