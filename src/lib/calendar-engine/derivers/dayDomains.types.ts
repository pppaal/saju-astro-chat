/**
 * dayDomains 공유 소형 타입 — copy(데이터)·로직 양쪽이 쓰되 순환 import 가 안
 * 생기도록 별도 모듈로 뽑았다. (인터페이스가 아니라 alias/const 라 런타임 비용 0.)
 */

/** ko/en 한 쌍. */
export type Pair = { ko: string; en: string }

export type DayScoreBand = 'good' | 'mid' | 'low'

/** 십신 5분류 — 비겁/식상/재성/관성/인성. */
export type SibsinCategory = 'self' | 'output' | 'wealth' | 'officer' | 'resource'

export const SIBSIN_CATEGORY: Record<string, SibsinCategory> = {
  비견: 'self',
  겁재: 'self',
  식신: 'output',
  상관: 'output',
  정재: 'wealth',
  편재: 'wealth',
  정관: 'officer',
  편관: 'officer',
  정인: 'resource',
  편인: 'resource',
}
