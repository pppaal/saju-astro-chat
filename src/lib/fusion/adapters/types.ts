// fusion/adapters/types.ts
// 서비스별 어댑터 공통 타입.

import type { ThemeKey, CrossTone, ThemeTimingCross } from '../crosses/types'

// ============================================================
// 캘린더
// ============================================================

export interface CalendarDay {
  date: string                             // 'YYYY-MM-DD'
  iljin?: string                           // '갑자' (사주 일진)
  domainScores: Partial<Record<ThemeKey, number>>  // 도메인 → 점수 (0~1)
  topDomain: ThemeKey | null               // 가장 강한 도메인
  tone: CrossTone                          // 그 날 전체 tone
  label: string                            // '결혼 길일', '신중' 등
  summary: string                          // 한 줄 요약
}

export interface CalendarMonth {
  year: number
  month: number                            // 1-12
  days: CalendarDay[]
  highlights: {
    bestDays: CalendarDay[]                // 점수 높은 top 5
    cautionDays: CalendarDay[]             // tone cautious 인 날
    auspiciousByDomain: Partial<Record<ThemeKey, CalendarDay[]>>  // 테마별 좋은 날
  }
  // 월 통계
  monthScore: number                       // 그 달 평균 점수 (0~1)
  monthTone: CrossTone                     // 그 달 전체 결
  monthlyDomains: Partial<Record<ThemeKey, number>>  // 도메인별 월 평균
  monthNarrative: string                   // 그 달 해석 한 줄
}

export interface CalendarDayDetail {
  date: string
  iljin?: string
  lunar?: string                           // 음력 'YYYY-MM-DD' (caller 제공)
  isCheoneulGwiin?: boolean                // 천을귀인 (caller 제공)
  crosses: ThemeTimingCross[]              // 18 테마 풀 cross
  topInsights: string[]                    // 핵심 narrative 5-7개
  // 데일리 통계
  domainScores: Partial<Record<ThemeKey, number>>  // 도메인 → 점수 (0~1)
  advice: { do: string[]; avoid: string[] }        // 조언
  bestDaysOfMonth?: Array<{                        // 이 달 TOP 3 (옵션)
    date: string
    label: string
    score: number
  }>
}
