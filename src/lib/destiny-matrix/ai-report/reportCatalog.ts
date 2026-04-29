/**
 * 출시용 리포트 카탈로그 — 사주+점성 통합 엔진 위에 8개 리포트 노출.
 *
 * 카탈로그는 프론트엔드(/premium-reports) 메뉴 + 백엔드 라우팅 양쪽에서
 * "어떤 리포트를 살 수 있고 그 데이터 출처가 어디인지"를 단일 진실로 잡습니다.
 *
 * 데이터 출처:
 *  - comprehensive   : 통합 엔진 풀 envelope (본명 사주+점성 모두)
 *  - career/love/    : 통합 엔진 envelope + 도메인 렌즈
 *    wealth/health/    (activityScores + 도메인 십신·하우스 강조)
 *    move
 *  - newYear         : 캘린더 365일 lite 데이터 압축 (좋은 시기·주의 시기)
 *  - monthly         : 캘린더 30일 lite 데이터 압축
 *
 * 'family'는 deprecated이지만 기존 결제·DB 호환을 위해 ReportTheme union엔
 * 남아있고, 본 카탈로그에는 노출하지 않습니다.
 */

import type { ReportPeriod, ReportTheme } from './types'

export type ReportCatalogId =
  | 'comprehensive'
  | 'career'
  | 'love'
  | 'wealth'
  | 'health'
  | 'move'
  | 'newYear'
  | 'monthly'

export type ReportSourceKind =
  | 'engineFull' // 통합 엔진 풀 envelope
  | 'engineDomain' // engineFull + 도메인 렌즈
  | 'calendarYearly' // 캘린더 365일 압축
  | 'calendarMonthly' // 캘린더 30일 압축

export interface ReportCatalogEntry {
  id: ReportCatalogId
  /** 분류 — 종합 / 도메인 / 시기 */
  kind: 'comprehensive' | 'themed' | 'timing'
  /** 결제·내부 라우팅용 키 — 기존 ReportTheme/ReportPeriod에 매핑 */
  themeKey?: ReportTheme
  periodKey?: ReportPeriod
  source: ReportSourceKind
  label: { ko: string; en: string }
  description: { ko: string; en: string }
  /** 캘린더 도메인 키 매핑 (없으면 일반) */
  calendarDomain?: 'career' | 'love' | 'money' | 'health' | 'move'
  /** 표시 순서 */
  order: number
}

export const REPORT_CATALOG: readonly ReportCatalogEntry[] = [
  {
    id: 'comprehensive',
    kind: 'comprehensive',
    periodKey: 'comprehensive',
    source: 'engineFull',
    label: { ko: '종합 리포트', en: 'Comprehensive Report' },
    description: {
      ko: '본명 사주 + 본명 점성을 한 번에 풀어 쓴 평생 분석',
      en: 'Lifetime analysis from full saju + western natal chart',
    },
    order: 1,
  },
  {
    id: 'career',
    kind: 'themed',
    themeKey: 'career',
    source: 'engineDomain',
    calendarDomain: 'career',
    label: { ko: '커리어 리포트', en: 'Career Report' },
    description: {
      ko: '본명 분석 + 직업·역할·성장 흐름',
      en: 'Natal frame + career roles, growth and timing',
    },
    order: 2,
  },
  {
    id: 'love',
    kind: 'themed',
    themeKey: 'love',
    source: 'engineDomain',
    calendarDomain: 'love',
    label: { ko: '관계 리포트', en: 'Relationship Report' },
    description: {
      ko: '본명 분석 + 관계 패턴·결혼 적기',
      en: 'Natal frame + relationship patterns and marriage timing',
    },
    order: 3,
  },
  {
    id: 'wealth',
    kind: 'themed',
    themeKey: 'wealth',
    source: 'engineDomain',
    calendarDomain: 'money',
    label: { ko: '재물 리포트', en: 'Wealth Report' },
    description: {
      ko: '본명 분석 + 재성·소득 구조·투자 리스크',
      en: 'Natal frame + income structure and investment risk',
    },
    order: 4,
  },
  {
    id: 'health',
    kind: 'themed',
    themeKey: 'health',
    source: 'engineDomain',
    calendarDomain: 'health',
    label: { ko: '건강 리포트', en: 'Health Report' },
    description: {
      ko: '본명 분석 + 체질 약점·과부하 신호·회복 리듬',
      en: 'Natal frame + constitutional weak points and recovery rhythm',
    },
    order: 5,
  },
  {
    id: 'move',
    kind: 'themed',
    themeKey: 'move',
    source: 'engineDomain',
    calendarDomain: 'move',
    label: { ko: '이동·이사 리포트', en: 'Movement & Relocation Report' },
    description: {
      ko: '본명 분석 + 역마·환경 변동·이사 적기',
      en: 'Natal frame + movement signals and relocation timing',
    },
    order: 6,
  },
  {
    id: 'newYear',
    kind: 'timing',
    periodKey: 'yearly',
    source: 'calendarYearly',
    label: { ko: '신년 운세', en: 'New Year Outlook' },
    description: {
      ko: '한 해 전체 흐름 — 좋은 시기·주의 시기·도메인별 피크',
      en: 'Full-year arc — favorable windows, caution windows, domain peaks',
    },
    order: 7,
  },
  {
    id: 'monthly',
    kind: 'timing',
    periodKey: 'monthly',
    source: 'calendarMonthly',
    label: { ko: '월간 운세', en: 'Monthly Outlook' },
    description: {
      ko: '한 달 흐름 — 주차별 톤과 도메인 추천',
      en: 'Month arc — weekly tone and domain priorities',
    },
    order: 8,
  },
] as const

export function getReportCatalogEntry(id: ReportCatalogId): ReportCatalogEntry | undefined {
  return REPORT_CATALOG.find((entry) => entry.id === id)
}

export function listReportCatalog(): readonly ReportCatalogEntry[] {
  return [...REPORT_CATALOG].sort((a, b) => a.order - b.order)
}
