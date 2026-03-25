import type {
  EventCategory,
  ImportanceGrade,
  ImportantDate,
} from '@/lib/destiny-map/destinyCalendar'
import type { CalendarEvidence } from '@/types/calendar-api'
import type { DomainKey, MonthlyOverlapPoint } from '@/lib/destiny-matrix/types'
import type { MatrixCalendarContext } from './calendarMatrixTextSupport'
import type {
  CalendarMatrixEvidencePacket,
  CalendarMatrixEvidencePacketMap,
} from './matrixEvidencePacket'
import { GRADE_THRESHOLDS, EVIDENCE_CONFIDENCE_THRESHOLDS } from '@/lib/destiny-map/calendar/scoring-config'
import { getFactorTranslation } from './translations'
import {
  describeCrossAgreement,
  describeCrossEvidenceBridge,
  describeEvidenceConfidence,
  describeExecutionStance,
  describePhaseFlow,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'
import { sanitizeMatrixNarrativeLine } from './calendarMatrixTextSupport'

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

const CATEGORY_PACKET_KEY: Record<string, string> = {
  career: 'career',
  study: 'career',
  love: 'love',
  wealth: 'wealth',
  health: 'health',
  travel: 'today',
  general: 'today',
}

const DOMAIN_PACKET_KEY: Record<NonNullable<CalendarEvidence['matrix']['domain']>, string> = {
  career: 'career',
  love: 'love',
  money: 'wealth',
  health: 'health',
  move: 'today',
  general: 'today',
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
  Sun: '태양',
  Moon: '달',
  Mercury: '수성',
  Venus: '금성',
  Mars: '화성',
  Jupiter: '목성',
  Saturn: '토성',
  'Natal Sun': '본명 태양',
}

function normalizeTextForDedupe(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function dedupeTexts(values: Array<string | null | undefined>): string[] {
  const out: string[] = []
  const keys: string[] = []
  for (const value of values) {
    const trimmed = String(value || '').trim()
    if (!trimmed) continue
    const key = normalizeTextForDedupe(trimmed)
    if (!key) continue
    const hasDuplicate = keys.some((existing) => {
      if (existing === key) return true
      const canCompareInclusion = existing.length >= 16 && key.length >= 16
      return canCompareInclusion && (existing.includes(key) || key.includes(existing))
    })
    if (hasDuplicate) continue
    keys.push(key)
    out.push(trimmed)
  }
  return out
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
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
  index: number,
  lang: 'ko' | 'en'
): string {
  const id = `A${index + 1}`
  const icon = detail.tone === 'negative' ? '⚠️' : detail.tone === 'positive' ? '✅' : 'ℹ️'
  const symbol = ASPECT_SYMBOL[detail.aspect]
  const orbText = formatOrb(detail.orb)
  const meaning = getAspectMeaning(detail.aspect, detail.tone, lang)

  if (lang === 'ko') {
    const planetA = PLANET_KO[detail.planetA] || detail.planetA
    const planetB = PLANET_KO[detail.planetB] || detail.planetB
    return `${icon} (${id}) ${planetA}(${detail.signA}) ${symbol} ${planetB}(${detail.signB}) (${orbText}) - ${meaning}`
  }

  const word = ASPECT_WORD_EN[detail.aspect]
  return `${icon} (${id}) ${detail.planetA} in ${detail.signA} ${word} ${detail.planetB} in ${detail.signB} (${orbText}) - ${meaning}`
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
  const astroDetails = aspectList.map((detail, index) =>
    formatAstroEvidenceLine(detail, index, lang)
  )

  const usedSajuKey = new Set<string>()
  const pickSajuKey = (preferNegative: boolean): string | undefined => {
    const keys = date.sajuFactorKeys || []
    const candidates = keys.filter((key) => !usedSajuKey.has(key))
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
    const sajuText = compactText(translatedSaju || orderedSajuFactors[index] || orderedSajuFactors[0] || '', 72)
    if (!sajuText) {
      return
    }
    sajuDetails.push(`(S${index + 1}) ${sajuText}`)
    bridges.push(describeCrossEvidenceBridge({ tone: detail.tone, aligned: isAligned, lang }))
  })

  if (astroDetails.length === 0 && orderedAstroFactors[0]) {
    astroDetails.push(`(A1) ${compactText(orderedAstroFactors[0], 78)}`)
  }
  if (sajuDetails.length === 0 && orderedSajuFactors[0]) {
    sajuDetails.push(`(S1) ${compactText(orderedSajuFactors[0], 78)}`)
  }

  const astroEvidence = compactText(astroDetails[0] || orderedAstroFactors[0] || '', 120)
  const sajuEvidence = compactText(sajuDetails[0] || orderedSajuFactors[0] || '', 120)

  const normalizedBridges =
    bridges.length > 0
      ? bridges
      : astroEvidence && sajuEvidence
        ? [
            lang === 'ko'
              ? describeCrossAgreement(isAligned ? 80 : 35, 'ko')
              : isAligned
                ? 'A1 ↔ S1: Astrology and Saju evidence point in the same direction.'
                : 'A1 ↔ S1: Signals are mixed. Re-check before final commitments.',
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
    .filter((entry): entry is { domain: DomainKey; point: MonthlyOverlapPoint } => Boolean(entry.point))
    .filter((entry) => entry.point.peakLevel === 'peak' || entry.point.peakLevel === 'high')
    .sort((a, b) => b.point.overlapStrength - a.point.overlapStrength)

  const topDomain = domainPeakCandidates[0]?.domain
  const cautionSignals = (matrixContext.calendarSignals || []).filter((signal) => signal.level === 'caution')
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
    const domainLabel = lang === 'ko' ? koDomainLabel[weightedDomain] : enDomainLabel[weightedDomain]
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
    const domainLabel = lang === 'ko' ? koDomainLabel[weightedDomain] : enDomainLabel[weightedDomain]
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

  if (weightedDomain && domainWeight >= 0.6 && (hasMonthCautionSignal || cautionSignals.length > 0)) {
    const domainLabel = lang === 'ko' ? koDomainLabel[weightedDomain] : enDomainLabel[weightedDomain]
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

export function selectMatrixPacketForDate(input: {
  categories: string[]
  evidenceDomain: CalendarEvidence['matrix']['domain']
  packets?: CalendarMatrixEvidencePacketMap
}): CalendarMatrixEvidencePacket | null {
  const packets = input.packets
  if (!packets) return null

  const byDomain = packets[DOMAIN_PACKET_KEY[input.evidenceDomain]]
  if (byDomain) return byDomain

  for (const category of input.categories) {
    const normalizedCategory = String(category || '').trim().toLowerCase()
    const packetKey = CATEGORY_PACKET_KEY[normalizedCategory]
    if (packetKey && packets[packetKey]) return packets[packetKey]
  }

  return packets.today || packets.general || null
}

export function attachMatrixVerdict(
  evidence: CalendarEvidence,
  packet: CalendarMatrixEvidencePacket | null
): CalendarEvidence {
  if (!packet) return evidence

  return {
    ...evidence,
    matrixVerdict: {
      focusDomain: packet.focusDomain,
      verdict: sanitizeMatrixNarrativeLine(packet.verdict),
      guardrail: sanitizeMatrixNarrativeLine(packet.guardrail),
      topClaim: sanitizeMatrixNarrativeLine(packet.topClaims[0]?.text || ''),
      topAnchorSummary: sanitizeMatrixNarrativeLine(packet.topAnchorSummary),
      phase: packet.strategyBrief?.overallPhaseLabel,
      attackPercent: packet.strategyBrief?.attackPercent,
      defensePercent: packet.strategyBrief?.defensePercent,
      timingWindow: packet.topTimingWindow?.window,
      whyNow: sanitizeMatrixNarrativeLine(packet.topTimingWindow?.whyNow || ''),
      entryConditions: (packet.topTimingWindow?.entryConditions || [])
        .map((item) => sanitizeMatrixNarrativeLine(item))
        .filter(Boolean),
      abortConditions: (packet.topTimingWindow?.abortConditions || [])
        .map((item) => sanitizeMatrixNarrativeLine(item))
        .filter(Boolean),
    },
  }
}

export function buildMatrixFirstSummary(input: {
  verdict?: string
  topClaim?: string
  topAnchorSummary?: string
  fallbackSummary: string
}): string {
  return dedupeTexts([
    sanitizeMatrixNarrativeLine(input.fallbackSummary),
    sanitizeMatrixNarrativeLine(input.verdict),
    sanitizeMatrixNarrativeLine(input.topClaim),
    sanitizeMatrixNarrativeLine(input.topAnchorSummary),
  ]).join(' ')
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
      describeCrossAgreement(agreement, 'ko'),
    ]).join(' ')
  }

  const peakText =
    peak === 'peak' ? 'peak window' : peak === 'high' ? 'rising window' : 'steady window'
  return dedupeTexts([
    `${domainLabel} is in a ${peakText}.`,
    describeEvidenceConfidence(confidence, 'en'),
    describeCrossAgreement(agreement, 'en'),
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
  const baseDetail =
    input.lang === 'ko'
      ? `${domainLabel} 이슈는 ${describePhaseFlow(matrixVerdict?.phase, 'ko')}`
      : `In ${domainLabel}, ${describePhaseFlow(matrixVerdict?.phase, 'en').toLowerCase()}`
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
  const out = dedupeTexts([input.topClaim || '', ...(input.matrixRecommendations || [])]).slice(0, 6)
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
}): string[] {
  const out = dedupeTexts([input.guardrail || '', ...(input.matrixWarnings || [])]).slice(0, 6)
  if (out.length > 0) return out

  return input.lang === 'ko'
    ? ['신호가 약하거나 엇갈릴 때는 확정 전에 한 번 더 재검증하는 편이 안전합니다.']
    : ['When shared-matrix confidence is low, re-validate before irreversible actions.']
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
