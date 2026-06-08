/**
 * cellsToYearlyDates — v2 CalendarCell[] → 날짜별 캘린더 DTO (마이그레이션 단계 1c).
 *
 * 구 calculateYearlyImportantDates(destiny-map "v3" 경로)를 대체하는 v2-native
 * 어댑터. 점수·등급·교차검증·축분해·패턴·신호·일진·서사를 셀에서 조립.
 * destiny-map 의존 0 — grade/crossAgreement deriver(모두 엔진 소유) 사용.
 *
 * ※ 단계 1 은 순수 추가(additive). 라우트는 아직 이 어댑터를 쓰지 않는다. 단위
 *   테스트 + 단계 0 골든으로 점수·등급 동등성을 검증한 뒤 단계 2 에서 배선한다.
 */
import type { ActiveSignal, CalendarCell } from '../types'
import { scoreToGrade, type CalendarGrade } from '../derivers/grade'
import { deriveCrossAgreement, type AxisAgreement } from '../derivers/crossAgreement'
import { computeDayStem, computeDayBranch } from '../extractors/saju-shinsal'
import { signalDisplayLabel } from '../derivers/summary'

export type CalendarLang = 'ko' | 'en'

export interface V2DatePattern {
  id: string
  name: string
  strength: number
  description?: string
  headline?: string
  action?: string
}

export interface V2EngineSignal {
  id: string
  source: 'saju' | 'astro'
  kind: string
  name: string
  korean?: string
  polarity: number
  layer: ActiveSignal['layer']
  weight: number
}

export interface V2CalendarDate {
  date: string // YYYY-MM-DD
  ganzhi: string
  score: number
  displayScore: number
  grade: CalendarGrade
  matchedPatterns: V2DatePattern[]
  engineSignals: V2EngineSignal[]
  // 교차검증
  crossVerified: boolean
  confidence: number
  crossAgreementPercent: number
  scoreBreakdown: {
    sajuAxis: number
    astroAxis: number
    sajuAxisRaw: number
    astroAxisRaw: number
    axisAgreement: AxisAgreement
    finalScore: number
  }
  // 근거·서사
  sajuFactors: string[]
  astroFactors: string[]
  title: string
  description: string
  recommendations: string[]
  warnings: string[]
}

export interface CellsToYearlyDatesOptions {
  lang?: CalendarLang
}

/** 신호 → 사용자 표시 라벨 (ko: korean 우선; en: english 우선, 없으면 name 용어 치환) */
function signalLabel(s: ActiveSignal, lang: CalendarLang): string {
  return signalDisplayLabel(s, lang)
}

/** 점수 밴드 폴백 제목 — 패턴 headline 이 없을 때. */
function scoreBandTitle(grade: CalendarGrade, lang: CalendarLang): string {
  const ko = ['최고의 흐름', '순풍이 부는 날', '평범한 하루', '한 번 더 살필 날', '지켜야 할 날']
  const en = [
    'Peak flow',
    'Favorable wind',
    'An ordinary day',
    'Worth a second check',
    'A day to protect',
  ]
  return (lang === 'ko' ? ko : en)[grade] ?? (lang === 'ko' ? '평범한 하루' : 'An ordinary day')
}

function mapPattern(p: CalendarCell['matchedPatterns'][number], lang: CalendarLang): V2DatePattern {
  const en = lang === 'en'
  return {
    id: p.id,
    name: (en ? p.nameEn : undefined) ?? p.name,
    strength: p.strength,
    description: (en ? p.descriptionEn : undefined) ?? p.description,
    headline: (en ? p.headlineEn : undefined) ?? p.headline,
    action: (en ? p.actionEn : undefined) ?? p.action,
  }
}

/**
 * 단일 신호 → V2EngineSignal (언어별). EN 일 때 name/korean 모두 영문 — 한글 누수 차단.
 * (route.ts 가 hourly engineSignals 를 직접 부착할 때도 재사용.)
 */
export function mapEngineSignal(s: ActiveSignal, lang: CalendarLang): V2EngineSignal {
  return {
    id: s.id,
    source: s.source,
    kind: s.kind,
    name: signalDisplayLabel(s, lang),
    korean: lang === 'en' ? (s.english ?? signalDisplayLabel(s, 'en')) : (s.korean ?? s.name),
    polarity: s.polarity,
    layer: s.layer,
    weight: s.weight,
  }
}

function mapHourlySignals(signals: ActiveSignal[], lang: CalendarLang): V2EngineSignal[] {
  return signals.filter((s) => s.layer === 'hourly').map((s) => mapEngineSignal(s, lang))
}

/** 한 셀 → 날짜 DTO. */
export function cellToYearlyDate(cell: CalendarCell, lang: CalendarLang = 'ko'): V2CalendarDate {
  const date = cell.datetime.slice(0, 10)
  const score = cell.derivedScore
  const grade = scoreToGrade(score)
  const cross = deriveCrossAgreement(cell)

  // 근거 — source 별 무게 큰 신호 라벨 (상위 5)
  const bySourceLabels = (source: 'saju' | 'astro') =>
    [...cell.signals]
      .filter((s) => s.source === source && Math.abs(s.polarity) > 0)
      .sort((a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight)
      .slice(0, 5)
      .map((s) => signalLabel(s, lang))

  const patterns = cell.matchedPatterns.map((p) => mapPattern(p, lang))

  // 언어별 사유 배열 — EN 은 build 때 채운 topReasonsEn/cautionsEn 사용(없으면 KO 폴백).
  const topReasons = lang === 'en' ? (cell.topReasonsEn ?? cell.topReasons) : cell.topReasons
  const cautions = lang === 'en' ? (cell.cautionsEn ?? cell.cautions) : cell.cautions

  // 제목·설명 — 패턴 headline/action 우선, 없으면 점수밴드 + topReasons
  const en = lang === 'en'
  const pHeadline = (p: CalendarCell['matchedPatterns'][number]) =>
    (en ? p.headlineEn : undefined) ?? p.headline
  const pAction = (p: CalendarCell['matchedPatterns'][number]) =>
    (en ? p.actionEn : undefined) ?? p.action
  const pDescription = (p: CalendarCell['matchedPatterns'][number]) =>
    (en ? p.descriptionEn : undefined) ?? p.description

  const topPattern = [...cell.matchedPatterns].sort((a, b) => b.strength - a.strength)[0]
  const title = (topPattern ? pHeadline(topPattern)?.trim() : '') || scoreBandTitle(grade, lang)
  const description =
    (topPattern ? pAction(topPattern)?.trim() : '') ||
    (topPattern ? pDescription(topPattern)?.trim() : '') ||
    topReasons.slice(0, 2).join(lang === 'ko' ? ' · ' : '; ') ||
    scoreBandTitle(grade, lang)

  // 추천 = 패턴 액션들 + 우호 사유; 주의 = cautions
  const recommendations = [
    ...cell.matchedPatterns.map((p) => pAction(p)).filter((a): a is string => !!a && a.length > 0),
    ...topReasons,
  ].slice(0, 5)
  const warnings = cautions.slice(0, 5)

  // ganji
  const probe = new Date(`${date}T12:00:00.000Z`)
  const stem = Number.isNaN(probe.valueOf()) ? null : computeDayStem(probe)
  const branch = Number.isNaN(probe.valueOf()) ? null : computeDayBranch(probe)
  const ganzhi = stem && branch ? `${stem}${branch}` : ''

  return {
    date,
    ganzhi,
    score,
    displayScore: score,
    grade,
    matchedPatterns: patterns,
    engineSignals: mapHourlySignals(cell.signals, lang),
    crossVerified: cross.crossVerified,
    confidence: cross.confidence,
    crossAgreementPercent: cross.crossAgreementPercent,
    scoreBreakdown: {
      sajuAxis: cross.sajuAxis,
      astroAxis: cross.astroAxis,
      sajuAxisRaw: cross.sajuAxisRaw,
      astroAxisRaw: cross.astroAxisRaw,
      axisAgreement: cross.axisAgreement,
      finalScore: cross.finalScore,
    },
    sajuFactors: bySourceLabels('saju'),
    astroFactors: bySourceLabels('astro'),
    title,
    description,
    recommendations,
    warnings,
  }
}

/** 셀 배열 → 날짜 DTO 배열 (날짜 오름차순). */
export function cellsToYearlyDates(
  cells: CalendarCell[],
  options: CellsToYearlyDatesOptions = {}
): V2CalendarDate[] {
  const lang = options.lang ?? 'ko'
  return cells
    .filter((c) => c.datetime)
    .map((c) => cellToYearlyDate(c, lang))
    .sort((a, b) => a.date.localeCompare(b.date))
}
