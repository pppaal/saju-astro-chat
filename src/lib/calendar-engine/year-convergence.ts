import { getOrBuildMonth } from './cell-cache'
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

export interface YearInsights {
  convergence: Convergence
  monthly: YearMonthSummary[]
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
    // 57/43 — scoreGrade.ts ABSOLUTE cutoff 와 정렬. 이전 58 은 점수 57(="좋은
    // 날") 인 달이 tone='flat' 으로 어긋남.
    const tone: YearMonthSummary['tone'] = score >= 57 ? 'up' : score <= 43 ? 'down' : 'flat'
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

  // 12개월 cell-cache 재사용 — 메인 /api/calendar 가 같은 (birthKey, monthKey) 로
  // 이미 채워둔 셀들을 그대로 가져오면 lazy convergence 가 사실상 무비용.
  // 이전엔 buildCalendar 365일 한 번 호출이라 cell-cache 우회 → 매번 cold ~1.7s.
  const monthResults = await Promise.all(
    Array.from({ length: 12 }, (_, i) => {
      const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`
      const startMs = Date.UTC(year, i, 1)
      const endMs = Date.UTC(year, i + 1, 0, 23, 59, 59, 999)
      return getOrBuildMonth({
        birthKey,
        monthKey,
        natal,
        range: {
          start: new Date(startMs).toISOString(),
          end: new Date(endMs).toISOString(),
          granularity: 'day',
        },
        options: { includeEvidence: true },
      })
    })
  )
  const cells: CalendarCell[] = monthResults.flatMap((r) => r.cells)

  const convergence = deriveConvergence(cells, topN, lang)
  const monthly = aggregateMonthly(cells)
  const insights: YearInsights = { convergence, monthly }

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
