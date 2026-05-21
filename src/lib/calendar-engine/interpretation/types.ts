/**
 * 해석 룰 시스템.
 *
 * 매 사용자 매 시기마다 LLM 호출하지 않고, 사전 작성된 룰을 매칭·합성.
 * 룰은 "활성 신호의 조합 → 해석 텍스트 템플릿".
 * 결정적·캐시 가능·빠름.
 */

import type { FiveElement, SibsinKind } from '@/lib/saju/types'
import type { KeyEvents } from '../derivers/keyEvents'
import type { MonthComparison } from '../derivers/monthComparison'

/** 룰이 매칭되는 시점 */
export type RuleScope = 'monthly' | 'yearly' | 'daily' | 'lifetime'

/** 룰 매칭 조건 — 모든 조건이 AND로 결합. 필드가 없으면 그 차원은 미체크. */
export interface RuleConditions {
  /** 본명 일간 강약 (예: 'weak' / 'strong' / 'medium') */
  natalStrength?: Array<'weak' | 'medium' | 'strong'>
  /** 본명 용신 오행 (예: ['목', '화']) */
  yongsin?: FiveElement[]

  /** 활성 신호의 source — 신호 다발에서 매칭 시 사용 */
  signalSource?: 'saju' | 'astro'
  /** 활성 신호의 kind */
  signalKinds?: string[]
  /** 활성 신호의 layer */
  signalLayer?: Array<'decadal' | 'yearly' | 'monthly' | 'daily'>

  /** 사주 신호 limited — sibsin 종류 */
  sibsin?: SibsinKind[]
  /** 사주 신호 limited — 신살명 */
  shinsalName?: string[]

  /** 점성 신호 — 행성 이름 */
  planet?: string[]
  /** 점성 신호 — sign 이름 */
  sign?: string[]
  /** 점성 신호 — dignity 상태 */
  dignity?: Array<'domicile' | 'exaltation' | 'detriment' | 'fall'>

  /** 매칭 패턴 ID (derivePatterns 결과) */
  patternId?: string[]

  /** 신호 폴라리티 최소값 (>=) */
  minPolarity?: number
  /** 신호 폴라리티 최대값 (<=) */
  maxPolarity?: number
}

/**
 * 한 해석 룰.
 * 조건 매칭되면 template에 변수 치환해서 출력.
 */
export interface InterpretationRule {
  id: string
  scope: RuleScope
  /**
   * 해석이 다루는 영역 — UI에서 섹션 헤더 또는 정렬에 사용.
   * 예: 'daeun', 'wolun', 'transit-jupiter', 'theme-money', 'shinsal'
   */
  section: string
  /** 매칭 조건 */
  conditions: RuleConditions
  /**
   * 텍스트 템플릿 (한국어).
   * 변수: {daeunGanji} {primaryYongsin} {monthGanji} {natalDayMaster}
   *      {planet} {sign} {dignity} {duration} {count} {luckyDates}
   *      {sibsin} {shinsalName} {ganji} 등.
   * 자연스러운 문장 1~5개.
   */
  template: string
  /**
   * 텍스트 템플릿 (영어). 없으면 영어 빌드 시 한국어 template 으로 fallback.
   * 변수 키는 한국어 template 과 동일.
   */
  templateEn?: string
  /**
   * 우선순위 — 매칭 룰 많을 때 상위 N개 선택.
   * 큰 흐름(大運) 90, 세운 80, 월운 70, 일진 60 등 차등 부여.
   */
  priority: number
  /** UI 표시용 테마 라벨 (재물/연애/직업/...) */
  themes?: string[]
  /** 작성자 메모 — 명리/점성 검수용 */
  authorNote?: string
}

/**
 * 해석 결과 — buildInterpretation의 반환.
 */
export interface Interpretation {
  /** 합성된 narrative 텍스트 (마크다운 가능) */
  narrative: string
  /** 매칭된 룰의 ID 리스트 (캡·dedup 적용 후 실제 노출된 것) */
  matchedRuleIds: string[]
  /**
   * 캡(SECTION_CAP)·dedup 적용 *전*, 조건이 매칭된 전체 룰 ID. `debug:true` 일
   * 때만 채움. 룰 커버리지 감사용 — matchedRuleIds(picked)는 섹션 캡에 가려진
   * 룰을 죽은 룰로 오인하므로 "조건이 실제로 켜지나"는 이 필드로 측정.
   */
  allMatchedRuleIds?: string[]
  /** 섹션별 분해 (UI에서 카드별 표시할 때) */
  sections: Array<{
    section: string
    title: string
    text: string
  }>
  /**
   * 도메인별 점수 — narrative와 동기화된 0-100 값.
   *
   * cell.themeScores는 신호 polarity 평균(+공명 보너스)이라 narrative
   * 톤(룰 매칭 기반)과 어긋날 수 있음. 이 필드는 도메인별 실제 매칭된
   * 룰들의 polarity 평균으로 계산 — narrative와 1:1 정합.
   *
   * 사용 우선순위: 이 필드 > cell.themeScores (UI 표시용).
   */
  themeScores?: Partial<Record<'love' | 'money' | 'career' | 'health' | 'growth', number>>
  /**
   * 테마별 점수 "인과 추적" (Why-card). 그 점수에 기여한 신호 top N 을
   * +/- 기여도와 함께 노출 — "재물 68 ← 정재 월지 +12 / 천을귀인 +8 /
   * 겁재 분탈 −7" 식. 점수만 던지지 않고 *근거* 를 보여줘 신뢰도 ↑.
   */
  themeBreakdown?: Partial<
    Record<
      'love' | 'money' | 'career' | 'health' | 'growth',
      Array<{ label: string; delta: number; dir: 'up' | 'down' }>
    >
  >
  /**
   * "이번 달 키 이벤트" — 본문 날짜 정보를 카드로 추출 (베스트 날 / 강한 구간
   * / 피할 날). cells.derivedScore 에서 결정적으로 뽑음. monthly scope 에서만.
   */
  keyEvents?: KeyEvents
  /**
   * "지난달 대비" — 전월 themeScore / 전체 흐름 점수와의 차이. prevCells 가
   * 주어진 monthly scope 에서만 채워짐 (retention hook).
   */
  monthComparison?: MonthComparison
}

/**
 * 템플릿 변수 — matcher가 룰 발화 시 채울 값.
 */
export interface TemplateVars {
  // 본명
  natalDayMaster?: string
  natalStrength?: string
  primaryYongsin?: string
  yongsinElement?: string

  // 시기
  daeunGanji?: string
  /** 한자 ganji 의 영어 로마자 변형 — 영어 템플릿이 사용 (Imjin, Gapja, ...) */
  daeunGanjiEn?: string
  /** 60갑자 본명 archetype 을 transit 어조로 변환한 한 줄 — getGanjiTransitNarrative 출처 */
  daeunGanjiText?: string
  /** English variant — 영어 템플릿이 사용 */
  daeunGanjiTextEn?: string
  daeunSibsin?: string
  daeunStartYear?: number
  yearGanji?: string
  yearGanjiEn?: string
  yearGanjiText?: string
  yearGanjiTextEn?: string
  yearSibsin?: string
  monthGanji?: string
  monthGanjiEn?: string
  monthGanjiText?: string
  monthGanjiTextEn?: string
  monthSibsin?: string
  monthName?: string

  // 신호 컨텍스트
  planet?: string
  sign?: string
  dignity?: string
  duration?: string
  sibsin?: string
  shinsalName?: string
  /** 같은 shinsal name 이 활성화되는 모든 MM-DD ' · ' 로 묶음 (최대 5개) */
  shinsalDates?: string
  shinsalDatesCount?: string
  ganji?: string

  // 패턴/통계
  count?: number
  luckyDates?: string
  unluckyDates?: string
  patternName?: string

  // 추가 라벨
  [key: string]: string | number | undefined
}
