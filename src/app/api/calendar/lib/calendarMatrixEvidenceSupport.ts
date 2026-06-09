import type { EventCategory, ImportanceGrade, ImportantDate } from '@/lib/calendar/destinyCalendar'
import type { CalendarEvidence } from '@/types/calendar-api'
import type { DomainKey, MonthlyOverlapPoint } from '@/lib/calendar-engine/matrix/types'
import type { MatrixCalendarContext } from './calendarMatrixTextSupport'
import { GRADE_THRESHOLDS, EVIDENCE_CONFIDENCE_THRESHOLDS } from '@/lib/calendar/scoring-config'
import { getFactorTranslation } from './translations'
import { PLANET_KO as PLANET_KO_BASE } from '@/lib/calendar-engine/data/planetNames'
import {
  describeCrossAgreement,
  describeCrossEvidenceBridge,
  describeEvidenceConfidence,
  describeExecutionStance,
  describePhaseFlow,
} from '@/lib/calendar-engine/matrix/interpretation/humanSemantics'
import type { CrossSystemTone } from '@/lib/calendar-engine/matrix/interpretation/humanSemanticsConflictSupport'
import { focusDomainFromCategory } from '@/lib/calendar-engine/matrix/interpretation/humanSemanticsFocusDomain'
import { sanitizeMatrixNarrativeLine } from './calendarMatrixTextSupport'
import { clamp01 } from '@/lib/utils/math'
import { dedupeTexts } from './textDedupe'

type CrossEvidenceBundle = {
  sajuEvidence?: string
  astroEvidence?: string
  sajuDetails?: string[]
  astroDetails?: string[]
  bridges?: string[]
}

type AspectEvidenceLite = {
  key: string
  planetA: string
  planetB: string
  signA: string
  signB: string
  aspect: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  orb: number
  tone: 'positive' | 'negative' | 'neutral'
  impactScore: number
  context: 'transitToNatalSun' | 'transitToTransit'
}

const CATEGORY_TO_MATRIX_DOMAIN: Partial<Record<EventCategory, DomainKey>> = {
  wealth: 'money',
  career: 'career',
  love: 'love',
  health: 'health',
  travel: 'move',
}

const ASPECT_SYMBOL: Record<AspectEvidenceLite['aspect'], string> = {
  conjunction: '☌',
  sextile: '✶',
  square: '□',
  trine: '△',
  opposition: '☍',
}

const ASPECT_WORD_EN: Record<AspectEvidenceLite['aspect'], string> = {
  conjunction: 'conjunct',
  sextile: 'sextile',
  square: 'square',
  trine: 'trine',
  opposition: 'oppose',
}

const PLANET_KO: Record<string, string> = {
  ...PLANET_KO_BASE,
  'Natal Sun': '본명 태양',
}

function compactText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  const sentenceCut = normalized.split(/[.!?。]/)[0]?.trim() || normalized
  if (sentenceCut.length <= maxLength) {
    return sentenceCut
  }
  return `${sentenceCut.slice(0, Math.max(8, maxLength - 1)).trimEnd()}…`
}

function formatOrb(orb: number): string {
  const safe = Number.isFinite(orb) ? Math.max(0, orb) : 0
  let degree = Math.floor(safe)
  let minute = Math.round((safe - degree) * 60)
  if (minute === 60) {
    degree += 1
    minute = 0
  }
  return `${degree}°${String(minute).padStart(2, '0')}'`
}

function isNegativeFactorKey(key: string): boolean {
  const lower = key.toLowerCase()
  return [
    'chung',
    'xing',
    'hai',
    'retrograde',
    'gongmang',
    'gwansal',
    'samjae',
    'conflict',
    'void',
    'backho',
    'guimungwan',
  ].some((token) => lower.includes(token))
}

function isPositiveFactorKey(key: string): boolean {
  const lower = key.toLowerCase()
  return [
    'samhap',
    'yukhap',
    'cheoneul',
    'gwiin',
    'harmony',
    'support',
    'growth',
    'jaeseong',
    'inseong',
  ].some((token) => lower.includes(token))
}

function getPreferredDomainByCategory(
  categories: EventCategory[],
  matrixContext: MatrixCalendarContext
): DomainKey | null {
  if (!matrixContext?.domainScores) return null
  for (const category of categories) {
    const mapped = CATEGORY_TO_MATRIX_DOMAIN[category]
    if (mapped && matrixContext.domainScores[mapped]) {
      return mapped
    }
  }
  return null
}

function getDomainWeight(
  domain: DomainKey | null,
  monthPoint: MonthlyOverlapPoint | undefined,
  matrixContext: MatrixCalendarContext
): number {
  if (!domain || !matrixContext?.domainScores) return 0
  const score = matrixContext.domainScores[domain]?.finalScoreAdjusted ?? 5
  const scoreWeight = clamp01((score - 5) / 5)
  const overlapWeight = clamp01(monthPoint?.overlapStrength ?? 0)
  const peakBoost =
    monthPoint?.peakLevel === 'peak' ? 0.22 : monthPoint?.peakLevel === 'high' ? 0.12 : 0
  return clamp01(scoreWeight * 0.55 + overlapWeight * 0.35 + peakBoost)
}

function toEvidenceDomain(domain: DomainKey | null): CalendarEvidence['matrix']['domain'] {
  if (!domain) return 'general'
  return domain
}

function getAspectMeaning(
  aspect: AspectEvidenceLite['aspect'],
  tone: AspectEvidenceLite['tone'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    if (tone === 'negative') {
      if (aspect === 'square') return '긴장·힘겨루기 구도'
      if (aspect === 'opposition') return '충돌·관계 재조정 신호'
      return '압박·검증 필요 신호'
    }
    if (tone === 'positive') {
      if (aspect === 'trine') return '흐름·지원이 강한 구도'
      if (aspect === 'sextile') return '기회·협력 창구 확대'
      return '추진력·집중력 상승'
    }
    if (aspect === 'conjunction') return '에너지 증폭 구간'
    return '중립 신호'
  }

  if (tone === 'negative') {
    if (aspect === 'square') return 'pressure and power-friction pattern'
    if (aspect === 'opposition') return 'polarity and negotiation pressure'
    return 'high-friction caution signal'
  }
  if (tone === 'positive') {
    if (aspect === 'trine') return 'smooth support flow'
    if (aspect === 'sextile') return 'opportunity and collaboration window'
    return 'momentum and concentration support'
  }
  if (aspect === 'conjunction') return 'amplified focus window'
  return 'neutral signal'
}

function formatAstroEvidenceLine(
  detail: AspectEvidenceLite,
  _index: number,
  lang: 'ko' | 'en'
): string {
  const icon = detail.tone === 'negative' ? '⚠️' : detail.tone === 'positive' ? '✅' : 'ℹ️'
  const symbol = ASPECT_SYMBOL[detail.aspect]
  const orbText = formatOrb(detail.orb)
  const meaning = getAspectMeaning(detail.aspect, detail.tone, lang)

  if (lang === 'ko') {
    const planetA = PLANET_KO[detail.planetA] || detail.planetA
    const planetB = PLANET_KO[detail.planetB] || detail.planetB
    return `${icon} ${planetA}(${detail.signA}) ${symbol} ${planetB}(${detail.signB}) (${orbText}) - ${meaning}`
  }

  const word = ASPECT_WORD_EN[detail.aspect]
  return `${icon} ${detail.planetA} in ${detail.signA} ${word} ${detail.planetB} in ${detail.signB} (${orbText}) - ${meaning}`
}

function toAspectEvidenceList(date: ImportantDate): AspectEvidenceLite[] {
  if (!Array.isArray(date.astroAspectEvidence)) {
    return []
  }
  return date.astroAspectEvidence
    .filter((item): item is AspectEvidenceLite =>
      Boolean(item && typeof item === 'object' && item.aspect && item.planetA && item.planetB)
    )
    .slice(0, 3)
}

function getMatrixDomainLabel(
  domain: CalendarEvidence['matrix']['domain'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    if (domain === 'career') return '커리어'
    if (domain === 'love') return '연애'
    if (domain === 'money') return '재정'
    if (domain === 'health') return '건강'
    if (domain === 'move') return '이동'
    return '전반'
  }

  if (domain === 'career') return 'career'
  if (domain === 'love') return 'relationship'
  if (domain === 'money') return 'finance'
  if (domain === 'health') return 'health'
  if (domain === 'move') return 'mobility'
  return 'overall'
}

type ScoreBreakdownLite = {
  sajuAxisRaw: number
  astroAxisRaw: number
  axisAgreement: 'aligned' | 'mixed' | 'opposed'
}

/**
 * 두 축의 raw 점수 + axisAgreement 로 시스템 레벨 합치 톤을 결정한다.
 * - axisAgreement === 'aligned' 이면서 두 축 평균이 55 이상 → bothSystems
 * - axisAgreement === 'aligned' 이면서 두 축 평균이 45 이하 → bothBlocked
 * - axisAgreement === 'aligned' 이고 중간대 (45~55) → mixed (확언 회피)
 * - axisAgreement === 'opposed' → opposed
 * - axisAgreement === 'mixed' 또는 scoreBreakdown 없음 → mixed
 *
 * ImportantDate (destinyCalendar) 에는 scoreBreakdown 이 정의돼 있지 않지만
 * yearlyDates.ts 에서 결과 객체에 attach 한다 (api/calendar/lib/types.ts
 * 의 ImportantDate 가 그 augmented shape). 안전하게 cast 로 접근.
 */
function resolveCrossSystemTone(date: ImportantDate, fallbackAligned: boolean): CrossSystemTone {
  const breakdown = (date as ImportantDate & { scoreBreakdown?: ScoreBreakdownLite }).scoreBreakdown
  if (!breakdown) {
    return fallbackAligned ? 'bothSystems' : 'mixed'
  }
  if (breakdown.axisAgreement === 'opposed') {
    return 'opposed'
  }
  if (breakdown.axisAgreement === 'mixed') {
    return 'mixed'
  }
  // aligned: 두 raw 축의 평균으로 합치 방향성 판정 (override-shift 없는 raw 사용)
  const avg = (breakdown.sajuAxisRaw + breakdown.astroAxisRaw) / 2
  if (avg >= 55) return 'bothSystems'
  if (avg <= 45) return 'bothBlocked'
  return 'mixed'
}

export function buildCrossEvidenceBundle(
  date: ImportantDate,
  lang: 'ko' | 'en',
  orderedSajuFactors: string[],
  orderedAstroFactors: string[],
  crossAgreementPercent: number | undefined,
  isAlignedAcrossSystems: (crossAgreementPercent: number | undefined) => boolean
): CrossEvidenceBundle {
  const aspectList = toAspectEvidenceList(date)
  const isAligned = isAlignedAcrossSystems(crossAgreementPercent)
  const crossSystemTone = resolveCrossSystemTone(date, isAligned)
  // date.categories 의 첫 카테고리(가장 강한 그루핑)를 9 도메인 KO 라벨로 정규화.
  // ImportantDate 가 매핑 가능한 categories 를 갖지 않으면 focusDomain 은 undefined
  // 로 남고, describeCrossEvidenceBridge 는 기존 추상 흐름 문구로 fall back.
  const focusDomain = focusDomainFromCategory(date.categories?.[0]) ?? undefined
  const astroDetails = aspectList.map((detail, index) =>
    formatAstroEvidenceLine(detail, index, lang)
  )

  const usedSajuKey = new Set<string>()
  // preferNegative 는 두 축이 같이 막힌 (bothBlocked/opposed) 자리에서만 true.
  // bothSystems 자리에서는 사주 키도 우호 우선으로 골라 saju/bridge 톤이 어긋나지
  // 않게 한다.
  const systemPrefersNegative = crossSystemTone === 'bothBlocked' || crossSystemTone === 'opposed'
  const pickSajuKey = (aspectIsNegative: boolean): string | undefined => {
    const keys = date.sajuFactorKeys || []
    const candidates = keys.filter((key) => !usedSajuKey.has(key))
    // 시스템 톤이 우호적이면 aspect 한 개의 부정 톤 때문에 negative 사주 키를
    // 끌어오지 않는다 — 그래야 bothSystems 일자에 사주 evidence 가 conflict 인용으로
    // 빠지지 않는다.
    const preferNegative = systemPrefersNegative ? true : aspectIsNegative
    const prioritized = candidates.find((key) =>
      preferNegative ? isNegativeFactorKey(key) : isPositiveFactorKey(key)
    )
    const selected = prioritized || candidates[0]
    if (selected) {
      usedSajuKey.add(selected)
    }
    return selected
  }

  const sajuDetails: string[] = []
  const bridges: string[] = []

  aspectList.forEach((detail, index) => {
    const sajuKey = pickSajuKey(detail.tone === 'negative')
    const translatedSaju = sajuKey ? getFactorTranslation(sajuKey, lang) || sajuKey : ''
    const sajuText = compactText(
      translatedSaju || orderedSajuFactors[index] || orderedSajuFactors[0] || '',
      72
    )
    if (!sajuText) {
      return
    }
    sajuDetails.push(sajuText)
    // crossSystemTone 우선 사용 — 일자별 시스템 레벨 합치 상태가
    // 개별 aspect tone (top-3 중 1개 square 같은 케이스) 보다 정확.
    bridges.push(
      describeCrossEvidenceBridge({
        tone: detail.tone,
        aligned: isAligned,
        lang,
        crossSystemTone,
        focusDomain,
      })
    )
  })

  if (astroDetails.length === 0 && orderedAstroFactors[0]) {
    astroDetails.push(compactText(orderedAstroFactors[0], 78))
  }
  if (sajuDetails.length === 0 && orderedSajuFactors[0]) {
    sajuDetails.push(compactText(orderedSajuFactors[0], 78))
  }

  const astroEvidence = compactText(astroDetails[0] || orderedAstroFactors[0] || '', 120)
  const sajuEvidence = compactText(sajuDetails[0] || orderedSajuFactors[0] || '', 120)

  // Fallback (top-3 aspect 가 없을 때) — 시스템 톤 기반 흐름 브리지로 통일해서
  // describeCrossAgreement 의 일반 문구 ("교차 일치도 ~%") 가 카드에 박히던 패턴
  // 제거. crossSystemTone 가 mixed/opposed 면 자연스럽게 hedge 톤이 잡힌다.
  const normalizedBridges =
    bridges.length > 0
      ? bridges
      : astroEvidence && sajuEvidence
        ? [
            describeCrossEvidenceBridge({
              tone: 'neutral',
              aligned: isAligned,
              lang,
              crossSystemTone,
              focusDomain,
            }),
          ]
        : []

  return {
    sajuEvidence,
    astroEvidence,
    sajuDetails: sajuDetails.slice(0, 3),
    astroDetails: astroDetails.slice(0, 3),
    bridges: normalizedBridges.slice(0, 3),
  }
}

export function buildMatrixOverlay(
  dateIso: string,
  matrixContext: MatrixCalendarContext,
  categories: EventCategory[],
  lang: 'ko' | 'en',
  dateGrade: ImportanceGrade,
  dateConfidence: number | undefined,
  crossAgreementPercent: number | undefined,
  cross: {
    sajuEvidence?: string
    astroEvidence?: string
    sajuDetails?: string[]
    astroDetails?: string[]
    bridges?: string[]
  },
  isLowCoherenceSignal: (
    confidence: number | undefined,
    crossAgreementPercent: number | undefined
  ) => boolean
): { summary: string; recommendations: string[]; warnings: string[]; evidence: CalendarEvidence } {
  const monthKey = dateIso.slice(0, 7)
  if (!matrixContext) {
    return {
      summary: '',
      recommendations: [],
      warnings: [],
      evidence: {
        matrix: {
          domain: 'general',
          finalScoreAdjusted: 5,
          overlapStrength: 0,
          peakLevel: 'normal',
          monthKey,
        },
        cross: {
          sajuEvidence: cross.sajuEvidence || '',
          astroEvidence: cross.astroEvidence || '',
          sajuDetails: cross.sajuDetails || [],
          astroDetails: cross.astroDetails || [],
          bridges: cross.bridges || [],
        },
        confidence: 0,
        crossAgreementPercent:
          typeof crossAgreementPercent === 'number' && Number.isFinite(crossAgreementPercent)
            ? Math.max(0, Math.min(100, Math.round(crossAgreementPercent)))
            : undefined,
        source: 'rule',
      },
    }
  }

  const monthPoint = (matrixContext.overlapTimeline || []).find((point) => point.month === monthKey)
  const domainPeakCandidates = Object.entries(matrixContext.overlapTimelineByDomain || {})
    .map(([domain, points]) => ({
      domain: domain as DomainKey,
      point: points.find((point) => point.month === monthKey),
    }))
    .filter((entry): entry is { domain: DomainKey; point: MonthlyOverlapPoint } =>
      Boolean(entry.point)
    )
    .filter((entry) => entry.point.peakLevel === 'peak' || entry.point.peakLevel === 'high')
    .sort((a, b) => b.point.overlapStrength - a.point.overlapStrength)

  const topDomain = domainPeakCandidates[0]?.domain
  const cautionSignals = (matrixContext.calendarSignals || []).filter(
    (signal) => signal.level === 'caution'
  )
  const hasMonthCautionSignal = cautionSignals.some((signal) => signal.trigger.includes(monthKey))
  const preferredDomain = getPreferredDomainByCategory(categories, matrixContext)
  const weightedDomain = preferredDomain || topDomain || null
  const domainWeight = getDomainWeight(weightedDomain, monthPoint, matrixContext)
  const overlapStrength = clamp01(monthPoint?.overlapStrength ?? 0)
  const peakBoost =
    monthPoint?.peakLevel === 'peak' ? 0.22 : monthPoint?.peakLevel === 'high' ? 0.12 : 0
  const confidence = Math.round(
    clamp01(domainWeight * 0.5 + overlapStrength * 0.3 + peakBoost * 0.2) * 100
  )
  const score = weightedDomain
    ? (matrixContext.domainScores?.[weightedDomain]?.finalScoreAdjusted ?? 5)
    : 5
  const riskDay = dateGrade >= 3 || isLowCoherenceSignal(dateConfidence, crossAgreementPercent)

  const koDomainLabel: Record<DomainKey, string> = {
    career: '커리어',
    love: '연애',
    money: '재물',
    health: '건강',
    move: '이동',
  }
  const enDomainLabel: Record<DomainKey, string> = {
    career: 'career',
    love: 'love',
    money: 'money',
    health: 'health',
    move: 'movement',
  }

  const summaryParts: string[] = []
  const recommendations: string[] = []
  const warnings: string[] = []

  if (!riskDay && monthPoint?.peakLevel === 'peak') {
    summaryParts.push(
      lang === 'ko'
        ? `이번 달(${monthKey})은 타이밍을 잡기 비교적 좋은 흐름입니다.`
        : `This month (${monthKey}) is a relatively good window for timing decisions.`
    )
  } else if (!riskDay && monthPoint?.peakLevel === 'high') {
    summaryParts.push(
      lang === 'ko'
        ? `이번 달(${monthKey})은 힘을 분산하지 않으면 성과를 내기 좋은 흐름입니다.`
        : `This month (${monthKey}) supports focused execution when you keep scope tight.`
    )
  }

  if (!riskDay && topDomain) {
    if (lang === 'ko') {
      recommendations.push(
        `${koDomainLabel[topDomain]} 쪽이 상대적으로 잘 풀리는 구간이라 우선순위를 앞에 두는 편이 좋습니다.`
      )
    } else {
      recommendations.push(`${topDomain} domain is peaking. Put it at the top of your priorities.`)
    }
  }

  if (!riskDay && weightedDomain && domainWeight >= 0.55) {
    const domainLabel =
      lang === 'ko' ? koDomainLabel[weightedDomain] : enDomainLabel[weightedDomain]
    if (lang === 'ko') {
      recommendations.push(
        domainWeight >= 0.75
          ? `오늘은 ${domainLabel} 관련 핵심 과제를 가장 먼저 처리하는 편이 좋습니다.`
          : `${domainLabel} 관련 일정은 초반 시간대에 먼저 배치하는 편이 안정적입니다.`
      )
      summaryParts.push(
        `${domainLabel} 쪽에 힘이 실려 있어 잘게 나눠 밀면 성과가 나기 쉬운 날입니다.`
      )
    } else {
      recommendations.push(
        domainWeight >= 0.75
          ? `${domainLabel} is your top execution priority today.`
          : `Front-load ${domainLabel} tasks earlier in the day.`
      )
      summaryParts.push(`${domainLabel} has elevated destiny-matrix weighting today.`)
    }
  }

  if (riskDay && weightedDomain) {
    const domainLabel =
      lang === 'ko' ? koDomainLabel[weightedDomain] : enDomainLabel[weightedDomain]
    summaryParts.push(
      lang === 'ko'
        ? `${domainLabel} 쪽은 변동성이 있어 서두르기보다 확인과 조율을 먼저 하는 편이 좋습니다.`
        : `${domainLabel} is volatile today; review-first execution is safer than hard commitment.`
    )
  }

  if (cautionSignals.length > 0) {
    warnings.push(
      lang === 'ko'
        ? '주의 신호가 보여서 결론을 서두르기보다 한 번 더 검토하는 편이 좋습니다.'
        : 'Matrix caution signals detected. Add an extra verification step.'
    )
  }

  if (hasMonthCautionSignal) {
    warnings.push(
      lang === 'ko'
        ? `이번 달(${monthKey})은 속도보다 리스크 점검을 우선하는 편이 유리합니다.`
        : `In ${monthKey}, risk checks are safer than speed in decisions.`
    )
  }

  if (
    weightedDomain &&
    domainWeight >= 0.6 &&
    (hasMonthCautionSignal || cautionSignals.length > 0)
  ) {
    const domainLabel =
      lang === 'ko' ? koDomainLabel[weightedDomain] : enDomainLabel[weightedDomain]
    warnings.push(
      lang === 'ko'
        ? `${domainLabel} 쪽은 바로 키우기보다 체크리스트로 확인한 뒤 움직이는 편이 안전합니다.`
        : `For ${domainLabel}, run a verification checklist before expansion.`
    )
  }

  const evidence: CalendarEvidence = {
    matrix: {
      domain: toEvidenceDomain(weightedDomain),
      finalScoreAdjusted: Number(score.toFixed(2)),
      overlapStrength: Number(overlapStrength.toFixed(2)),
      peakLevel:
        monthPoint?.peakLevel === 'peak' || monthPoint?.peakLevel === 'high'
          ? monthPoint.peakLevel
          : 'normal',
      monthKey,
    },
    cross: {
      sajuEvidence: cross.sajuEvidence || '',
      astroEvidence: cross.astroEvidence || '',
      sajuDetails: cross.sajuDetails || [],
      astroDetails: cross.astroDetails || [],
      bridges: cross.bridges || [],
    },
    confidence: Math.max(0, Math.min(100, confidence)),
    crossAgreementPercent:
      typeof crossAgreementPercent === 'number' && Number.isFinite(crossAgreementPercent)
        ? Math.max(0, Math.min(100, Math.round(crossAgreementPercent)))
        : undefined,
    source: 'rule',
  }

  return {
    summary: summaryParts.join(' '),
    recommendations: dedupeTexts(recommendations),
    warnings: dedupeTexts(warnings),
    evidence,
  }
}

// selectMatrixPacketForDate / attachMatrixVerdict 함수 제거됨 — matrix packet 항상 null
// 이라 두 함수 모두 noop fast path 만 실행했음. helpers.ts 에서 직접 evidence 사용.

export function buildMatrixFirstSummary(input: {
  verdict?: string
  topClaim?: string
  topAnchorSummary?: string
  fallbackSummary: string
}): string {
  const primary = compactText(sanitizeMatrixNarrativeLine(input.fallbackSummary), 160)
  const supportSource = sanitizeMatrixNarrativeLine(
    input.topAnchorSummary || input.topClaim || input.verdict
  )
  const support =
    supportSource && !/[�]|\?\?/.test(supportSource) ? compactText(supportSource, 120) : ''
  return dedupeTexts([primary, support]).slice(0, 2).join(' ')
}

export function buildMatrixFirstDescription(input: {
  topAnchorSummary?: string
  verdict?: string
  topClaim?: string
  overlaySummary?: string
  fallbackDescription: string
}): string {
  const matrixPreferred = dedupeTexts([
    sanitizeMatrixNarrativeLine(input.topAnchorSummary),
    sanitizeMatrixNarrativeLine(input.verdict),
    sanitizeMatrixNarrativeLine(input.topClaim),
    sanitizeMatrixNarrativeLine(input.overlaySummary),
  ]).join(' ')

  return matrixPreferred || sanitizeMatrixNarrativeLine(input.fallbackDescription)
}

export function buildMatrixStrictSummaryFallback(input: {
  lang: 'ko' | 'en'
  evidence: CalendarEvidence
}): string {
  const domainLabel = getMatrixDomainLabel(input.evidence.matrix?.domain, input.lang)
  const confidence = Math.max(0, Math.min(100, input.evidence.confidence ?? 0))
  const peak = input.evidence.matrix?.peakLevel || 'normal'
  const agreement = input.evidence.crossAgreementPercent
  // DomainKey 가 9 도메인 라벨로 매핑되면 cross-agreement 문구도 구체 영역으로 명시.
  const focusDomain = focusDomainFromCategory(input.evidence.matrix?.domain) ?? undefined

  if (input.lang === 'ko') {
    const peakText =
      peak === 'peak'
        ? '지금 밀기 좋은 흐름'
        : peak === 'high'
          ? '조금씩 속도를 올리기 좋은 흐름'
          : '무리 없이 운영하기 좋은 흐름'
    return dedupeTexts([
      `${domainLabel} 이슈는 ${peakText}입니다.`,
      describeEvidenceConfidence(confidence, 'ko'),
      describeCrossAgreement(agreement, 'ko', focusDomain),
    ]).join(' ')
  }

  const peakText =
    peak === 'peak' ? 'peak window' : peak === 'high' ? 'rising window' : 'steady window'
  return dedupeTexts([
    `${domainLabel} is in a ${peakText}.`,
    describeEvidenceConfidence(confidence, 'en'),
    describeCrossAgreement(agreement, 'en', focusDomain),
  ]).join(' ')
}

export function buildMatrixStrictDescriptionFallback(input: {
  lang: 'ko' | 'en'
  evidence: CalendarEvidence
  summary: string
  guardrail?: string
}): string {
  const domainLabel = getMatrixDomainLabel(input.evidence.matrix?.domain, input.lang)
  const confidence = Math.max(0, Math.min(100, input.evidence.confidence ?? 0))
  const matrixVerdict = input.evidence.matrixVerdict
  const focusDomain = focusDomainFromCategory(input.evidence.matrix?.domain) ?? undefined
  const baseDetail =
    input.lang === 'ko'
      ? `${domainLabel} 이슈는 ${describePhaseFlow(matrixVerdict?.phase, 'ko', focusDomain)}`
      : `In ${domainLabel}, ${describePhaseFlow(matrixVerdict?.phase, 'en', focusDomain).toLowerCase()}`
  const confidenceDetail =
    input.lang === 'ko'
      ? confidence < 40
        ? '지금은 확정이나 결제처럼 되돌리기 어려운 결정일수록 한 번 더 검토하는 편이 안전합니다.'
        : describeExecutionStance(matrixVerdict?.attackPercent, matrixVerdict?.defensePercent, 'ko')
      : confidence < 40
        ? 'Confidence is low, so recheck before any irreversible commitment.'
        : describeExecutionStance(matrixVerdict?.attackPercent, matrixVerdict?.defensePercent, 'en')

  return dedupeTexts([input.summary, baseDetail, confidenceDetail, input.guardrail || '']).join(' ')
}

export function buildMatrixStrictRecommendations(input: {
  lang: 'ko' | 'en'
  evidence: CalendarEvidence
  topClaim?: string
  matrixRecommendations: string[]
}): string[] {
  const out = dedupeTexts([input.topClaim || '', ...(input.matrixRecommendations || [])]).slice(
    0,
    6
  )
  if (out.length > 0) return out

  const domainLabel = getMatrixDomainLabel(input.evidence.matrix?.domain, input.lang)
  return input.lang === 'ko'
    ? [
        `${domainLabel} 관련해서 가장 중요한 일 한 가지부터 먼저 처리하세요.`,
        '결정 전에 체크리스트를 짧게라도 적어두세요.',
      ]
    : [
        `Execute one high-impact ${domainLabel} task first.`,
        'Document a short checklist before committing.',
      ]
}

export function buildMatrixStrictWarnings(input: {
  lang: 'ko' | 'en'
  evidence: CalendarEvidence
  guardrail?: string
  matrixWarnings: string[]
  /** 캘린더 grade — 0=가장 좋음 ~ 4=가장 나쁨. 좋은 등급에선 폴백 워닝 안 붙임 */
  grade?: number
}): string[] {
  const out = dedupeTexts([input.guardrail || '', ...(input.matrixWarnings || [])]).slice(0, 6)
  if (out.length > 0) return out

  // grade가 좋으면(<=1) 일반 폴백 워닝 안 붙임 — "흐름이 흔들리니"가 95점 날에 거짓말이 됨
  if (typeof input.grade === 'number' && input.grade <= 1) return []

  return input.lang === 'ko'
    ? ['오늘 흐름이 좀 흔들리니, 큰 결정은 한 번 더 보고 정하세요.']
    : ['Things feel a bit shaky today — double-check before big calls.']
}

export function buildMatrixFirstRecommendations(input: {
  matrixTopClaim?: string
  baseRecommendations: string[]
}): string[] {
  return dedupeTexts([input.matrixTopClaim || '', ...input.baseRecommendations]).slice(0, 6)
}

export function buildMatrixFirstWarnings(input: {
  matrixGuardrail?: string
  baseWarnings: string[]
  conservativeWarning?: string
}): string[] {
  return dedupeTexts([
    input.matrixGuardrail || '',
    ...(input.baseWarnings || []),
    input.conservativeWarning || '',
  ]).slice(0, 6)
}

export function clampDisplayScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function applyMatrixDisplayScoreBias(input: {
  baseScore: number
  evidence: CalendarEvidence
}): number {
  const matrixScore = input.evidence.matrix?.finalScoreAdjusted ?? 5
  const overlapStrength = input.evidence.matrix?.overlapStrength ?? 0
  const peakLevel = input.evidence.matrix?.peakLevel ?? 'normal'
  const confidence = input.evidence.confidence ?? 0
  const attack = input.evidence.matrixVerdict?.attackPercent ?? 50
  const defense = input.evidence.matrixVerdict?.defensePercent ?? 50

  const matrixBias = (matrixScore - 5) * 3.2
  const overlapBias = (overlapStrength - 0.5) * 10
  const peakBias = peakLevel === 'peak' ? 6 : peakLevel === 'high' ? 3 : 0
  const stanceBias = ((attack - defense) / 100) * 6
  const confidenceWeight =
    confidence >= EVIDENCE_CONFIDENCE_THRESHOLDS.medium
      ? 1
      : confidence >= EVIDENCE_CONFIDENCE_THRESHOLDS.low
        ? 0.7
        : 0.4

  return clampDisplayScore(
    input.baseScore + (matrixBias + overlapBias + peakBias + stanceBias) * confidenceWeight
  )
}

export function getEffectiveGradeFromDisplayScore(score: number): ImportanceGrade {
  if (score >= GRADE_THRESHOLDS.grade0) return 0
  if (score >= GRADE_THRESHOLDS.grade1) return 1
  if (score >= GRADE_THRESHOLDS.grade2) return 2
  if (score >= GRADE_THRESHOLDS.grade3) return 3
  return 4
}
