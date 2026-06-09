/**
 * @file 캘린더 날짜 DTO 타입 (YearlyImportantDate).
 *
 * [마이그레이션 단계 4] 구 calculateYearlyImportantDates(사주·점성 v3 blend 스코어링
 * 엔진, ~2200줄)는 제거됐다. 라이브 라우트는 이제 v2 calendar-engine 셀에서
 * cellsToImportantDates 로 날짜를 직접 만든다(src/app/api/calendar/lib/
 * cellsToImportantDates.ts). 점수·등급·축분해·교차검증·카테고리·모순방지 게이트
 * 키가 전부 단일 v2 출처.
 *
 * 이 파일에는 응답 파이프라인이 공유하는 날짜 DTO 타입만 남긴다 —
 * formatDateForResponse(helpers.ts) 입력 + cellsToImportantDates 출력 형태.
 */
import type { EventCategory, ImportanceGrade } from '@/lib/calendar/types'

export interface YearlyImportantDate {
  date: string
  grade: ImportanceGrade
  score: number
  rawScore?: number
  adjustedScore?: number
  displayScore?: number
  categories: EventCategory[]
  titleKey: string
  descKey: string
  ganzhi: string
  crossVerified: boolean
  transitSunSign: string
  sajuFactorKeys: string[]
  astroFactorKeys: string[]
  recommendationKeys: string[]
  warningKeys: string[]
  confidence?: number
  confidenceNote?: string
  crossAgreementPercent?: number
  /** 사주 ↔ 점성 교차 확인 한 줄 + 신뢰도 % */
  crossCheck?: { line: string; agreementPercent: number }
  /** 대운 / 세운 / 월운 / 일운 — 본명 일간 기준 십신까지 박은 풀 흐름 컨텍스트 */
  longCycleContext?: {
    daeun?: {
      ganji: string
      ageStart: number
      ageEnd: number
      sibsinStem?: string
      /** Years remaining until next 대운 (fractional) */
      yearsToNext?: number
      /** True when within 1 year of next 대운 boundary */
      transitionImminent?: boolean
      /** 다음 대운 ganji + sibsin (전환 임박 시 같이 보여주려고) */
      nextGanji?: string
      nextSibsinStem?: string
    }
    sewoon?: { ganji: string; year: number; sibsinStem?: string }
    wolwoon?: { ganji: string; sibsinStem?: string }
    iljin?: { ganji: string; sibsinStem?: string; sibsinBranch?: string }
  }
  /** 운끼리의 충/합/형 — 대운·세운·월운·일운 사이 + 본명 일주 vs 각 운 */
  cycleInteractions?: Array<{
    pair: string
    kind: '천간합' | '천간충' | '지지합' | '지지충' | '지지형' | '지지해' | '지지파' | '자형'
    blurb: string
  }>
  /** 점수 분해 — 사주축 / 점성축 표시값 + 두 축 일치도 + 최종 점수. */
  scoreBreakdown?: {
    sajuAxis: number
    astroAxis: number
    sajuAxisRaw: number
    astroAxisRaw: number
    axisAgreement: 'aligned' | 'mixed' | 'opposed'
    finalScore: number
  }
}
