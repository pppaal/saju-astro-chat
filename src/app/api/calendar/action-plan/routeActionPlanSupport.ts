import { repairMojibakeText } from '@/lib/text/mojibake'
import { calculateDailyPillar, generateHourlyAdvice } from '@/lib/prediction/ultra-precision-daily'
import { STEM_ELEMENTS } from '@/lib/destiny-map/config/specialDays.data'
import { getHourlyRecommendation } from '@/lib/destiny-map/calendar/specialDays-analysis'
import { normalizeReportTheme } from '@/lib/destiny-matrix/ai-report/themeSchema'
import {
  formatDecisionActionLabels,
  formatPolicyCheckLabels,
} from '@/lib/destiny-matrix/core/actionCopy'
import { describeTimingWindowBrief } from '@/lib/destiny-matrix/interpretation/humanSemantics'

export type TimelineTone = 'best' | 'caution' | 'neutral'
export type SlotType =
  | 'deepWork'
  | 'decision'
  | 'communication'
  | 'money'
  | 'relationship'
  | 'recovery'

export type SlotWhy = {
  signalIds: string[]
  anchorIds: string[]
  patterns: string[]
  summary: string
}

export type TimelineSlot = {
  hour: number
  minute?: number
  label?: string
  note: string
  tone?: TimelineTone
  slotTypes?: SlotType[]
  why?: SlotWhy
  guardrail?: string
  evidenceSummary?: string[]
  confidence?: number
  confidenceReason?: string[]
  source?: 'rule' | 'rag' | 'hybrid'
}

type CalendarEvidence = {
  matrix?: {
    domain?: 'career' | 'love' | 'money' | 'health' | 'move' | 'general'
    finalScoreAdjusted?: number
    overlapStrength?: number
    peakLevel?: 'peak' | 'high' | 'normal'
    monthKey?: string
  }
  cross?: {
    sajuEvidence?: string
    astroEvidence?: string
    sajuDetails?: string[]
    astroDetails?: string[]
    bridges?: string[]
  }
  confidence?: number
  source?: 'rule' | 'rag' | 'hybrid'
  matrixVerdict?: {
    focusDomain?: string
    verdict?: string
    guardrail?: string
    topClaim?: string
    topAnchorSummary?: string
    phase?: string
    attackPercent?: number
    defensePercent?: number
  }
  matrixPacket?: {
    focusDomain?: string
    graphRagEvidenceSummary?: {
      totalAnchors?: number
      totalSets?: number
    }
    topAnchors?: Array<{
      id?: string
      section?: string
      summary?: string
      setCount?: number
    }>
    topClaims?: Array<{
      id?: string
      text?: string
      domain?: string
      signalIds?: string[]
      anchorIds?: string[]
    }>
    scenarioBriefs?: Array<{
      id?: string
      domain?: string
      mainTokens?: string[]
      altTokens?: string[]
    }>
    selectedSignals?: Array<{
      id?: string
      domain?: string
      polarity?: string
      summary?: string
      score?: number
    }>
    strategyBrief?: {
      overallPhase?: string
      overallPhaseLabel?: string
      attackPercent?: number
      defensePercent?: number
    }
  }
}

export type ActionPlanCalendarContext = {
  grade?: number
  displayGrade?: number
  score?: number
  displayScore?: number
  categories?: string[]
  bestTimes?: string[]
  warnings?: string[]
  recommendations?: string[]
  sajuFactors?: string[]
  astroFactors?: string[]
  summary?: string
  canonicalCore?: {
    focusDomain?: string
    phase?: string
    phaseLabel?: string
    thesis?: string
    riskControl?: string
    primaryAction?: string
    primaryCaution?: string
    topDecisionLabel?: string
    attackPercent?: number
    defensePercent?: number
    confidence?: number
    judgmentPolicy?: {
      mode?: 'execute' | 'verify' | 'prepare'
      rationale?: string
      allowedActions?: string[]
      allowedActionLabels?: string[]
      blockedActions?: string[]
      blockedActionLabels?: string[]
      hardStops?: string[]
      hardStopLabels?: string[]
      softChecks?: string[]
      softCheckLabels?: string[]
    }
    topTimingWindow?: {
      domain?: string
      window?: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
      timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
      precisionReason?: string
      timingConflictNarrative?: string
      whyNow?: string
      entryConditions?: string[]
      abortConditions?: string[]
    }
    domainTimingWindows?: Array<{
      domain?: string
      window?: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
      timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
      precisionReason?: string
      timingConflictNarrative?: string
      whyNow?: string
      entryConditions?: string[]
      abortConditions?: string[]
    }>
  }
  evidence?: CalendarEvidence
} | null

export type ActionPlanInsights = {
  ifThenRules: string[]
  situationTriggers: string[]
  actionFramework: {
    do: string[]
    dont: string[]
    alternative: string[]
  }
  riskTriggers: string[]
  successKpi: string[]
  deltaToday: string
}

export const trimList = <T>(items: T[] | undefined, max: number): T[] | undefined => {
  if (!items || items.length === 0) return undefined
  return items.slice(0, max)
}

export const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export const extractHoursFromText = (value: string) => {
  if (!value || /년|월/.test(value)) return [] as number[]
  const normalized = value.replace(/\s+/g, '')
  const rangeMatch = normalized.match(/(\d{1,2})(?::\d{2})?[-~](\d{1,2})/)
  if (rangeMatch) {
    const start = Number(rangeMatch[1])
    const end = Number(rangeMatch[2])
    if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start > 23) return []
    const safeEnd = Math.min(24, Math.max(0, end))
    if (safeEnd <= start) return [start]
    return Array.from({ length: safeEnd - start }, (_, idx) => start + idx)
  }
  const singleMatch = normalized.match(/(\d{1,2})(?::\d{2})?/)
  if (!singleMatch) return []
  const hour = Number(singleMatch[1])
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return []
  return [hour]
}

export const cleanGuidanceText = (value: string, maxLength = 96): string => {
  const normalized = repairMojibakeText(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return ''

  const noEvidenceTail = normalized.replace(/\s*(근거|evidence)\s*:.*/i, '').trim()
  const noHype = noEvidenceTail
    .replace(
      /\b(자시|축시|인시|묘시|진시|사시|오시|미시|신시|유시|술시|해시)\s*\(([^)]*)\)\s*:?/g,
      ''
    )
    .replace(/\b(자시|축시|인시|묘시|진시|사시|오시|미시|신시|유시|술시|해시)\b/g, '')
    .replace(/\b(?:Ja|Chuk|In|Myo|Jin|Sa|O|Mi|Shin|Yu|Sul|Hae)-si\b[^:]*:?/gi, '')
    .replace(/인생을 바꿀[^.!\n]*/g, '')
    .replace(/완벽한 날[^.!\n]*/g, '')
    .replace(/1년에 몇 번[^.!\n]*/g, '')
    .replace(/에너지가 도와줘요!?/g, '')
    .replace(/청첩장[^.!\n]*/g, '')
    .replace(/예식장 예약[^.!\n]*/g, '')
    .replace(/핵심 1~2개[^.!\n]*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const cleaned = noHype.replace(/(?:\.\.\.|…|~)+$/g, '').trim()
  if (cleaned.includes('\uFFFD')) return ''
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, Math.max(20, maxLength - 3)).trimEnd()}...`
}

export const pickCrossLineByTone = (lines: string[] | undefined, tone: TimelineTone): string => {
  const list = (lines || []).map((line) => cleanGuidanceText(line, 120)).filter(Boolean)
  if (list.length === 0) return ''

  const hardPattern = /(square|opposition|긴장|충돌|압박|friction|caution|\u26a0)/i
  const softPattern = /(trine|sextile|지원|기회|흐름|support|flow|\u2705)/i

  if (tone === 'caution') {
    return list.find((line) => hardPattern.test(line)) || list[0]
  }
  if (tone === 'best') {
    return list.find((line) => softPattern.test(line)) || list[0]
  }
  return list[0]
}

export const buildCrossReasonText = (
  cross:
    | {
        sajuEvidence?: string
        astroEvidence?: string
        sajuDetails?: string[]
        astroDetails?: string[]
        bridges?: string[]
      }
    | undefined,
  tone: TimelineTone,
  locale: 'ko' | 'en'
): string => {
  if (!cross) return ''
  const astro =
    pickCrossLineByTone(cross.astroDetails, tone) ||
    cleanGuidanceText(cross.astroEvidence || '', 92)
  const saju =
    pickCrossLineByTone(cross.sajuDetails, tone) || cleanGuidanceText(cross.sajuEvidence || '', 80)
  if (!astro && !saju) return ''
  const merged = [astro, saju].filter(Boolean).join(' + ')
  const prefix = locale === 'ko' ? '근거: ' : 'Evidence: '
  return cleanGuidanceText(`${prefix}${merged}`, 132)
}

const CATEGORY_FOCUS_HINTS: Record<
  string,
  {
    ko: { morning: string; day: string; evening: string }
    en: { morning: string; day: string; evening: string }
  }
> = {
  career: {
    ko: {
      morning: '중요 업무 1건을 먼저 밀어붙이세요',
      day: '협업/보고는 핵심만 짧게 정리하세요',
      evening: '내일 우선순위를 3개로 압축하세요',
    },
    en: {
      morning: 'Push one high-impact work item first',
      day: 'Keep collaboration and updates concise',
      evening: 'Compress tomorrow into 3 priorities',
    },
  },
  wealth: {
    ko: {
      morning: '지출/투자 기준선을 먼저 확정하세요',
      day: '금전 의사결정은 수치 재확인 후 진행하세요',
      evening: '현금흐름 메모를 5분만 정리하세요',
    },
    en: {
      morning: 'Lock spending and investment guardrails first',
      day: 'Confirm numbers before money decisions',
      evening: 'Do a quick 5-minute cash-flow review',
    },
  },
  love: {
    ko: {
      morning: '감정 표현보다 의도를 먼저 명확히 하세요',
      day: '민감한 대화는 사실 확인부터 시작하세요',
      evening: '관계 대화 20분을 확보하세요',
    },
    en: {
      morning: 'Clarify intent before emotional messaging',
      day: 'Start sensitive talks with facts first',
      evening: 'Reserve 20 minutes for relationship conversation',
    },
  },
  health: {
    ko: {
      morning: '가벼운 운동으로 몸을 먼저 깨우세요',
      day: '과부하를 줄이고 수분/호흡을 챙기세요',
      evening: '수면 준비 루틴을 앞당기세요',
    },
    en: {
      morning: 'Wake your body with light movement',
      day: 'Reduce overload and protect hydration/breathing',
      evening: 'Start your sleep routine earlier',
    },
  },
  travel: {
    ko: {
      morning: '동선과 출발시간을 먼저 재점검하세요',
      day: '이동 중 변수 대비책을 준비하세요',
      evening: '내일 일정 버퍼를 확보하세요',
    },
    en: {
      morning: 'Re-check route and departure timing',
      day: 'Prepare a contingency for travel variables',
      evening: 'Add time buffer for tomorrow',
    },
  },
  study: {
    ko: {
      morning: '집중 학습 블록을 먼저 실행하세요',
      day: '핵심 개념 3개만 고정해서 복습하세요',
      evening: '요약 노트를 짧게 마무리하세요',
    },
    en: {
      morning: 'Run a focused study block first',
      day: 'Review only 3 core concepts',
      evening: 'Close with a short summary note',
    },
  },
}

export function getTimeBucket(hour: number): 'morning' | 'day' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'day'
  return 'evening'
}

export function normalizeActionCategory(category?: string): string {
  if (!category) return 'career'
  const normalized = normalizeReportTheme(category)
  if (normalized) return normalized

  const key = category.trim().toLowerCase()
  if (key === 'money') return 'wealth'
  if (key === 'move') return 'travel'
  if (key === 'general') return 'career'
  return key || 'career'
}

export function getCategoryFocusHint(
  category: string | undefined,
  hour: number,
  locale: 'ko' | 'en'
): string {
  const normalized = normalizeActionCategory(category)
  const hint = CATEGORY_FOCUS_HINTS[normalized]
  if (!hint) return locale === 'ko' ? '핵심 1가지에 집중하세요' : 'Focus on one core action'
  const bucket = getTimeBucket(hour)
  return hint[locale][bucket]
}

export function pickByHour(items: string[] | undefined, hour: number): string | null {
  if (!items || items.length === 0) return null
  const index =
    hour < 10 ? 0 : hour < 16 ? Math.min(1, items.length - 1) : Math.min(2, items.length - 1)
  const value = items[index]
  return value ? value.trim() : null
}

export function pickCategoryByHour(categories: string[] | undefined, hour: number): string {
  if (!categories || categories.length === 0) return 'career'
  const index =
    hour < 10
      ? 0
      : hour < 16
        ? Math.min(1, categories.length - 1)
        : Math.min(2, categories.length - 1)
  return normalizeActionCategory(categories[index] || categories[0] || 'career')
}

export type ActionPlanIcpProfile =
  | {
      primaryStyle?: string
      secondaryStyle?: string | null
      dominanceScore?: number
      affiliationScore?: number
      summary?: string
      traits?: string[]
    }
  | null
  | undefined

export type ActionPlanPersonaProfile =
  | {
      typeCode?: string
      personaName?: string
      summary?: string
      strengths?: string[]
      challenges?: string[]
      guidance?: string
      motivations?: string[]
      axes?: Record<string, { pole: string; score: number }>
    }
  | null
  | undefined

export function getHourlyWindowLabel(hour: number, locale: 'ko' | 'en'): string {
  if (locale === 'ko') {
    if (hour < 6) return '심야 정리 구간: 결정보다 정리/휴식 우선'
    if (hour < 9) return '아침 시동 구간: 핵심 1건 먼저 착수'
    if (hour < 12) return '오전 집중 구간: 복잡한 판단/실행 우선'
    if (hour < 15) return '점심 이후 조정 구간: 협업/정리 작업 적합'
    if (hour < 18) return '오후 실행 구간: 결과물 마감 속도 올리기'
    if (hour < 21) return '저녁 소통 구간: 대화/관계 조율 효율 상승'
    return '야간 회복 구간: 과부하 줄이고 다음 날 준비'
  }

  if (hour < 6) return 'Late-night low-noise window: favor cleanup and recovery'
  if (hour < 9) return 'Morning ramp-up window: start with one core task'
  if (hour < 12) return 'AM focus window: prioritize complex decisions and execution'
  if (hour < 15) return 'Post-lunch adjustment window: good for collaboration and review'
  if (hour < 18) return 'PM execution window: raise closure speed on deliverables'
  if (hour < 21) return 'Evening relationship window: communication quality tends to improve'
  return 'Night recovery window: reduce load and prep for tomorrow'
}

export function buildPersonalizationHint(input: {
  locale: 'ko' | 'en'
  tone: TimelineTone
  icp?: ActionPlanIcpProfile
  persona?: ActionPlanPersonaProfile
}): string {
  const { locale, tone, icp, persona } = input
  const hints: string[] = []

  const dominance = icp?.dominanceScore
  const affiliation = icp?.affiliationScore

  if (typeof dominance === 'number') {
    if (dominance >= 70) {
      hints.push(
        locale === 'ko'
          ? tone === 'caution'
            ? '결론을 미루고 체크리스트 3개부터 검증하세요'
            : '1차 결론을 빠르게 내고 후속 보완으로 마무리하세요'
          : tone === 'caution'
            ? 'Delay final decision and validate 3 checklist items first'
            : 'Lock a first decision quickly, then close with follow-up refinement'
      )
    } else if (dominance <= 35) {
      hints.push(
        locale === 'ko'
          ? '의사결정 전에 기준 2~3개를 먼저 고정하세요'
          : 'Fix 2-3 decision criteria before taking action'
      )
    }
  }

  if (typeof affiliation === 'number') {
    if (affiliation >= 70) {
      hints.push(
        locale === 'ko'
          ? '핵심 관계자 1명에게 먼저 공유해 오해를 줄이세요'
          : 'Pre-brief one key stakeholder to reduce misunderstanding'
      )
    } else if (affiliation <= 30) {
      hints.push(
        locale === 'ko'
          ? '알림을 끄고 40분 단독 집중 블록을 확보하세요'
          : 'Silence notifications and secure a 40-minute solo focus block'
      )
    }
  }

  const decisionPole = persona?.axes?.decision?.pole
  if (decisionPole === 'logic') {
    hints.push(
      locale === 'ko'
        ? '판단은 감각보다 수치/근거 2개를 기준으로 두세요'
        : 'Anchor decisions on two concrete metrics over intuition'
    )
  } else if (decisionPole === 'empathic') {
    hints.push(
      locale === 'ko'
        ? '결정 전에 상대 영향 1가지를 먼저 확인하세요'
        : 'Before deciding, check one human-impact factor first'
    )
  }

  const rhythmPole = persona?.axes?.rhythm?.pole
  if (rhythmPole === 'flow') {
    hints.push(
      locale === 'ko'
        ? '짧은 스프린트 2회로 추진력을 유지하세요'
        : 'Use two short sprints to maintain momentum'
    )
  } else if (rhythmPole === 'anchor') {
    hints.push(
      locale === 'ko'
        ? '정해진 순서 3단계로 진행하면 흔들림이 줄어듭니다'
        : 'Follow a fixed 3-step sequence to reduce drift'
    )
  }

  return cleanGuidanceText(hints[0] || '', 84)
}

export function buildPersonalSummaryTag(input: {
  locale: 'ko' | 'en'
  icp?: ActionPlanIcpProfile
  persona?: ActionPlanPersonaProfile
}): string | null {
  const { locale, icp, persona } = input
  const tokens: string[] = []

  if (icp?.primaryStyle)
    tokens.push(locale === 'ko' ? `ICP ${icp.primaryStyle}` : `ICP ${icp.primaryStyle}`)
  if (persona?.personaName) {
    tokens.push(
      locale === 'ko' ? `페르소나 ${persona.personaName}` : `Persona ${persona.personaName}`
    )
  } else if (persona?.typeCode) {
    tokens.push(locale === 'ko' ? `페르소나 ${persona.typeCode}` : `Persona ${persona.typeCode}`)
  }

  if (tokens.length === 0) return null
  return locale === 'ko' ? `개인화: ${tokens.join(', ')}` : `Personalization: ${tokens.join(', ')}`
}

export const containsAny = (value: string | undefined, keywords: string[]) => {
  const text = (value || '').toLowerCase()
  return keywords.some((keyword) => text.includes(keyword))
}

export const normalizeId = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)

type MatrixEvidencePacket = NonNullable<CalendarEvidence['matrixPacket']>

const SLOT_TYPE_DOMAIN_HINTS: Record<SlotType, string[]> = {
  deepWork: ['career', 'personality'],
  decision: ['career', 'timing'],
  communication: ['relationship', 'timing'],
  money: ['wealth'],
  relationship: ['relationship'],
  recovery: ['health', 'timing'],
}

export function getMatrixPacket(
  calendar?: ActionPlanCalendarContext
): MatrixEvidencePacket | undefined {
  return calendar?.evidence?.matrixPacket
}

export function getCanonicalCore(calendar?: ActionPlanCalendarContext) {
  return calendar?.canonicalCore
}

export function getCanonicalActionDomain(calendar?: ActionPlanCalendarContext): string {
  const canonical = getCanonicalCore(calendar)
  return canonical?.actionFocusDomain || canonical?.focusDomain || ''
}

export function getCanonicalBranchProjection(calendar?: ActionPlanCalendarContext) {
  return calendar?.canonicalCore?.projections?.branches
}

export function buildCanonicalTimingBrief(
  calendar: ActionPlanCalendarContext | undefined,
  locale: 'ko' | 'en'
): string {
  const canonical = getCanonicalCore(calendar)
  const actionDomain = getCanonicalActionDomain(calendar)
  const timing =
    canonical?.topTimingWindow ||
    canonical?.domainTimingWindows?.find((item) => item.domain === actionDomain) ||
    canonical?.domainTimingWindows?.find((item) => item.domain === canonical?.focusDomain) ||
    canonical?.domainTimingWindows?.[0]
  if (!timing?.window) return ''
  return describeTimingWindowBrief({
    domainLabel: actionDomain || timing.domain || '',
    window: timing.window,
    whyNow: timing.whyNow,
    entryConditions: timing.entryConditions || [],
    abortConditions: timing.abortConditions || [],
    timingGranularity: timing.timingGranularity,
    precisionReason: timing.precisionReason,
    timingConflictNarrative: timing.timingConflictNarrative,
    lang: locale,
  })
}

export function getMatrixVerdict(calendar?: ActionPlanCalendarContext) {
  return calendar?.evidence?.matrixVerdict
}

export function getEffectiveCalendarGrade(calendar?: ActionPlanCalendarContext): number {
  return calendar?.displayGrade ?? calendar?.grade ?? 2
}

export function getEffectiveCalendarScore(
  calendar?: ActionPlanCalendarContext
): number | undefined {
  return calendar?.displayScore ?? calendar?.score
}

export function normalizePacketDomain(domain?: string): string {
  const normalized = normalizeActionCategory(domain)
  if (normalized === 'love') return 'relationship'
  if (normalized === 'travel') return 'timing'
  return normalized
}

export function buildSlotDomainHints(
  slotTypes: SlotType[],
  category?: string,
  packet?: MatrixEvidencePacket
): Set<string> {
  const hints = new Set<string>()
  slotTypes.forEach((slotType) => {
    SLOT_TYPE_DOMAIN_HINTS[slotType].forEach((domain) => hints.add(domain))
  })
  const categoryHint = normalizePacketDomain(category)
  if (categoryHint) hints.add(categoryHint)
  const packetHint = normalizePacketDomain(packet?.focusDomain)
  if (packetHint) hints.add(packetHint)
  if (hints.size === 0) hints.add('personality')
  return hints
}

export function domainMatchesHints(domain: string | undefined, hints: Set<string>): boolean {
  const normalized = normalizePacketDomain(domain)
  if (!normalized) return false
  if (hints.has(normalized)) return true
  if (normalized === 'personality' && hints.has('career')) return true
  if (normalized === 'timing' && (hints.has('career') || hints.has('relationship'))) return true
  return false
}

export function getRelevantPacketEvidence(input: {
  packet?: MatrixEvidencePacket
  slotTypes: SlotType[]
  category?: string
  tone: TimelineTone
}) {
  const { packet, slotTypes, category, tone } = input
  const hints = buildSlotDomainHints(slotTypes, category, packet)
  const claims = (packet?.topClaims || []).filter((claim) =>
    domainMatchesHints(claim.domain, hints)
  )
  const anchors = (packet?.topAnchors || []).filter((anchor) => {
    const section = (anchor.section || '').toLowerCase()
    if (tone === 'caution') return section.includes('timing') || section.includes('recommend')
    if (slotTypes.includes('relationship'))
      return section.includes('pattern') || section.includes('overview')
    return true
  })
  const scenarios = (packet?.scenarioBriefs || []).filter((scenario) =>
    domainMatchesHints(scenario.domain, hints)
  )
  const signals = (packet?.selectedSignals || []).filter((signal) =>
    domainMatchesHints(signal.domain, hints)
  )

  return {
    claims: (claims.length ? claims : packet?.topClaims || []).slice(0, 2),
    anchors: (anchors.length ? anchors : packet?.topAnchors || []).slice(0, 2),
    scenarios: (scenarios.length ? scenarios : packet?.scenarioBriefs || []).slice(0, 1),
    signals: (signals.length ? signals : packet?.selectedSignals || []).slice(0, 3),
  }
}

export function derivePacketPatterns(input: {
  packet?: MatrixEvidencePacket
  slotTypes: SlotType[]
  category?: string
  tone: TimelineTone
  claims: Array<{ domain?: string; text?: string }>
  scenarios: Array<{ domain?: string; mainTokens?: string[]; altTokens?: string[] }>
}): string[] {
  const hints = buildSlotDomainHints(input.slotTypes, input.category, input.packet)
  const patterns = new Set<string>()
  const joinedText = [
    ...input.claims.map((claim) => claim.text || ''),
    ...input.scenarios.flatMap((scenario) => [
      ...(scenario.mainTokens || []),
      ...(scenario.altTokens || []),
    ]),
    input.packet?.strategyBrief?.overallPhaseLabel || '',
  ]
    .join(' ')
    .toLowerCase()

  if (input.tone === 'caution') patterns.add('risk_exposure_up')
  if (hints.has('relationship')) patterns.add('relationship_sensitivity_up')
  if (hints.has('wealth')) patterns.add('spending_impulse_up')
  if (
    input.slotTypes.includes('recovery') ||
    /recover|rest|reset|sleep|회복|휴식|정리/.test(joinedText)
  ) {
    patterns.add('recovery_need_up')
  }
  if (/speed|momentum|push|attack|fast|속도|추진|가속/.test(joinedText)) {
    patterns.add('speed_up_validation_down')
  }
  if (/risk|friction|delay|counter|caution|주의|충돌|마찰|검증/.test(joinedText)) {
    patterns.add('risk_exposure_up')
  }
  if (patterns.size === 0) patterns.add('signal_balance')
  return Array.from(patterns).slice(0, 3)
}

export function summarizeMatrixPacketForPrompt(
  packet: MatrixEvidencePacket | undefined,
  locale: 'ko' | 'en'
): string {
  if (!packet) return ''
  const topClaim = cleanGuidanceText(packet.topClaims?.[0]?.text || '', 140)
  const topAnchor = cleanGuidanceText(packet.topAnchors?.[0]?.summary || '', 120)
  const phase = cleanGuidanceText(packet.strategyBrief?.overallPhaseLabel || '', 48)
  const scenario = cleanGuidanceText(
    [
      ...(packet.scenarioBriefs?.[0]?.mainTokens || []),
      ...(packet.scenarioBriefs?.[0]?.altTokens || []),
    ].join(', '),
    96
  )
  const parts = [
    phase ? `phase=${phase}` : null,
    topClaim ? `claim=${topClaim}` : null,
    topAnchor ? `anchor=${topAnchor}` : null,
    scenario ? `scenario=${scenario}` : null,
  ].filter(Boolean)
  if (parts.length === 0) return ''
  return locale === 'ko'
    ? `matrix_packet: ${parts.join(' | ')}`
    : `matrix_packet: ${parts.join(' | ')}`
}

export function summarizeMatrixVerdictForPrompt(
  calendar: ActionPlanCalendarContext | undefined,
  locale: 'ko' | 'en'
): string {
  const verdict = getMatrixVerdict(calendar)
  if (!verdict) return ''
  const parts = [
    cleanGuidanceText(verdict.phase || '', 48),
    cleanGuidanceText(verdict.verdict || '', 140),
    cleanGuidanceText(verdict.topClaim || '', 120),
    cleanGuidanceText(verdict.guardrail || '', 120),
  ].filter(Boolean)
  if (parts.length === 0) return ''
  return locale === 'ko'
    ? `matrix_verdict: ${parts.join(' | ')}`
    : `matrix_verdict: ${parts.join(' | ')}`
}

export function inferSlotTypes(input: {
  hour: number
  tone: TimelineTone
  category?: string
  note: string
}): SlotType[] {
  const { hour, tone, category, note } = input
  const normalizedCategory = normalizeActionCategory(category)
  const types = new Set<SlotType>()
  if (hour < 6 || hour >= 22) types.add('recovery')
  if (hour >= 8 && hour < 12) types.add('deepWork')
  if (hour >= 12 && hour < 18) types.add('decision')
  if (hour >= 18 && hour < 22) types.add('communication')

  if (
    normalizedCategory === 'wealth' ||
    containsAny(note, ['money', 'budget', 'spend', '지출', '예산'])
  ) {
    types.add('money')
  }
  if (
    normalizedCategory === 'love' ||
    containsAny(note, ['relationship', 'message', 'talk', '관계', '대화', '소통'])
  ) {
    types.add('relationship')
  }
  if (tone === 'caution' && !types.has('recovery')) {
    types.add('decision')
  }

  const resolved = Array.from(types)
  if (resolved.length === 0) return ['deepWork']
  return resolved.slice(0, 2)
}

export function buildSlotWhy(input: {
  locale: 'ko' | 'en'
  slot: TimelineSlot
  slotTypes: SlotType[]
  category?: string
  calendar?: ActionPlanCalendarContext
  icp?: ActionPlanIcpProfile
  persona?: ActionPlanPersonaProfile
}): SlotWhy {
  const { locale, slot, slotTypes, category, calendar, icp, persona } = input
  const signalIds = new Set<string>()
  const anchorIds = new Set<string>()
  const patterns = new Set<string>()
  const packet = getMatrixPacket(calendar)
  const packetEvidence = getRelevantPacketEvidence({
    packet,
    slotTypes,
    category,
    tone: slot.tone || 'neutral',
  })

  const matrixDomain =
    calendar?.evidence?.matrix?.domain || normalizeActionCategory(category) || 'general'
  signalIds.add(`SIG_TONE_${normalizeId(slot.tone || 'neutral')}`)
  signalIds.add(`SIG_TYPE_${normalizeId(slotTypes[0] || 'deepWork')}`)
  signalIds.add(`SIG_DOMAIN_${normalizeId(matrixDomain)}`)
  signalIds.add(`SIG_TIME_${slot.hour < 12 ? 'AM' : slot.hour < 18 ? 'PM' : 'EVENING'}`)

  packetEvidence.claims.forEach((claim) => {
    ;(claim.signalIds || []).slice(0, 3).forEach((signalId) => signalIds.add(signalId))
    ;(claim.anchorIds || []).slice(0, 2).forEach((anchorId) => anchorIds.add(anchorId))
  })
  packetEvidence.signals.forEach((signal) => {
    if (signal.id) signalIds.add(signal.id)
  })
  packetEvidence.anchors.forEach((anchor) => {
    if (anchor.id) anchorIds.add(anchor.id)
  })

  if (slot.tone === 'best' && (icp?.dominanceScore || 0) >= 65)
    patterns.add('speed_up_validation_down')
  if (slot.tone === 'caution') patterns.add('risk_exposure_up')
  if (slotTypes.includes('relationship')) patterns.add('relationship_sensitivity_up')
  if (slotTypes.includes('money')) patterns.add('spending_impulse_up')
  if (slotTypes.includes('recovery')) patterns.add('recovery_need_up')
  derivePacketPatterns({
    packet,
    slotTypes,
    category,
    tone: slot.tone || 'neutral',
    claims: packetEvidence.claims,
    scenarios: packetEvidence.scenarios,
  }).forEach((pattern) => patterns.add(pattern))

  if (calendar?.sajuFactors?.[0]) anchorIds.add('ANCHOR_SAJU_FACTOR_1')
  if (calendar?.astroFactors?.[0]) anchorIds.add('ANCHOR_ASTRO_FACTOR_1')
  if (calendar?.evidence?.cross?.bridges?.[0]) anchorIds.add('ANCHOR_CROSS_BRIDGE_1')
  if (typeof persona?.axes?.decision?.score === 'number')
    anchorIds.add('ANCHOR_PERSONA_DECISION_AXIS')
  if (anchorIds.size === 0) anchorIds.add('ANCHOR_RULE_BASELINE')

  const patternList = Array.from(patterns)
  const patternHint = (patternList[0] || 'signal_balance').replace(/_/g, ' ')
  const summary =
    locale === 'ko'
      ? `${patternHint} 흐름이 강합니다. ${matrixDomain} 영역은 근거를 확인한 뒤 실행하세요.`
      : `${patternHint} is dominant. In ${matrixDomain}, validate evidence before final execution.`

  return {
    signalIds: Array.from(signalIds).slice(0, 4),
    anchorIds: Array.from(anchorIds).slice(0, 2),
    patterns: patternList.length ? patternList.slice(0, 3) : ['signal_balance'],
    summary: cleanGuidanceText(summary, 120),
  }
}

export function buildSlotGuardrail(input: {
  locale: 'ko' | 'en'
  slotTypes: SlotType[]
  tone: TimelineTone
  calendar?: ActionPlanCalendarContext
}): string {
  const { locale, slotTypes, tone, calendar } = input
  const canonical = getCanonicalCore(calendar)
  const riskAxisLabel = cleanGuidanceText(canonical?.riskAxisLabel || '', 48)
  const matrixGuardrail = cleanGuidanceText(
    canonical?.primaryCaution ||
      canonical?.riskControl ||
      getMatrixVerdict(calendar)?.guardrail ||
      '',
    120
  )
  const slotSpecific =
    tone === 'caution'
      ? locale === 'ko'
        ? '최종 확정 금지: 반대 근거 1개와 영향 범위 1줄 확인 후 확정'
        : 'No final decision until one counter-evidence and one impact line are verified.'
      : slotTypes.includes('money')
        ? locale === 'ko'
          ? '집행 전 총액·한도·최악손실 3개 숫자를 먼저 확인'
          : 'Check total, limit, and worst-case loss before spending or investing.'
        : slotTypes.includes('relationship')
          ? locale === 'ko'
            ? '전송 전 의도·요청·기한 3요소를 한 줄로 먼저 정리'
            : 'Before sending, make intent, request, and deadline clear in one line.'
          : slotTypes.includes('recovery')
            ? locale === 'ko'
              ? '새 약속 추가보다 회복과 정리를 우선'
              : 'Prioritize recovery and reset before adding new commitments.'
            : slotTypes.includes('decision')
              ? locale === 'ko'
                ? '결론 전에 판단 기준 2개를 먼저 적기'
                : 'Write two decision criteria before committing.'
              : locale === 'ko'
                ? '시작 전 성공 조건 1줄과 중단 기준 1줄을 기록'
                : 'Write one success condition and one stop condition before starting.'

  if (!matrixGuardrail) {
    if (!riskAxisLabel) return slotSpecific
    return [
      slotSpecific,
      locale === 'ko'
        ? `${riskAxisLabel} 축 리스크를 먼저 관리`
        : `Manage the ${riskAxisLabel} risk axis first.`,
    ]
      .filter(Boolean)
      .join(' / ')
  }
  if (matrixGuardrail.includes(slotSpecific)) return matrixGuardrail
  return [
    slotSpecific,
    matrixGuardrail,
    riskAxisLabel
      ? locale === 'ko'
        ? `${riskAxisLabel} 축 리스크를 먼저 관리`
        : `Manage the ${riskAxisLabel} risk axis first.`
      : '',
  ]
    .filter(Boolean)
    .join(' / ')
}

export function getPrimarySlotType(slotTypes: SlotType[]): SlotType {
  return slotTypes[0] || 'deepWork'
}

export function buildSlotActionCue(input: {
  locale: 'ko' | 'en'
  tone: TimelineTone
  slotTypes: SlotType[]
  category?: string
}): string {
  const { locale, tone, slotTypes, category } = input
  const primary = getPrimarySlotType(slotTypes)
  const normalizedCategory = normalizeActionCategory(category)
  const isKo = locale === 'ko'

  if (tone === 'caution') {
    if (primary === 'money' || normalizedCategory === 'wealth') {
      return isKo
        ? '숫자 검증만 하고 집행은 미루는 편이 낫습니다.'
        : 'Validate the numbers now and delay execution.'
    }
    if (primary === 'relationship') {
      return isKo
        ? '해석보다 확인 질문 1개가 우선입니다.'
        : 'One clarifying question beats interpretation right now.'
    }
    if (primary === 'decision') {
      return isKo
        ? '결론보다 검증과 재정렬에 쓰는 편이 낫습니다.'
        : 'Use this slot for validation and re-alignment, not commitment.'
    }
    return isKo
      ? '확정보다 리스크 제거에 쓰는 편이 낫습니다.'
      : 'Use this slot to remove risk, not to finalize.'
  }

  switch (primary) {
    case 'money':
      return isKo
        ? '예산·조건을 맞춘 뒤 실행하기 좋습니다.'
        : 'Good for execution after budget and terms are locked.'
    case 'relationship':
      return isKo
        ? '핵심 메시지를 짧고 명확하게 전하기 좋습니다.'
        : 'Good for a short, clear message or check-in.'
    case 'recovery':
      return isKo ? '회복과 정리 루틴을 넣기 좋습니다.' : 'Good for recovery, reset, and cleanup.'
    case 'decision':
      return isKo
        ? '판단 기준을 세우고 한 건 결정하기 좋습니다.'
        : 'Good for setting criteria and making one decision.'
    case 'communication':
      return isKo
        ? '설명, 조율, 피드백 전달에 유리합니다.'
        : 'Good for explanation, alignment, and feedback.'
    default:
      return isKo ? '핵심 한 건을 집중해서 밀기 좋습니다.' : 'Good for pushing one focused task.'
  }
}

export function buildSlotNarrative(input: {
  locale: 'ko' | 'en'
  hour: number
  tone: TimelineTone
  slotTypes: SlotType[]
  category?: string
  calendar?: ActionPlanCalendarContext
  fallbackNote?: string
  source?: 'rule' | 'rag' | 'hybrid'
}): string {
  const { locale, hour, tone, slotTypes, category, calendar, fallbackNote, source } = input
  const packet = getMatrixPacket(calendar)
  const canonical = getCanonicalCore(calendar)
  const verdict = getMatrixVerdict(calendar)
  const packetEvidence = canonical
    ? { claims: [], anchors: [], scenarios: [], signals: [] }
    : getRelevantPacketEvidence({
        packet,
        slotTypes,
        category,
        tone,
      })
  const focusHint = cleanGuidanceText(getCategoryFocusHint(category, hour, locale), 42)
  const phase = cleanGuidanceText(
    canonical?.phaseLabel || canonical?.phase || verdict?.phase || '',
    36
  )
  const claim = cleanGuidanceText(
    canonical?.topDecisionLabel ||
      canonical?.thesis ||
      packetEvidence.claims[0]?.text ||
      verdict?.topClaim ||
      verdict?.verdict ||
      '',
    100
  )
  const anchor = cleanGuidanceText(
    canonical?.riskControl ||
      canonical?.judgmentPolicy?.rationale ||
      packetEvidence.anchors[0]?.summary ||
      verdict?.topAnchorSummary ||
      '',
    84
  )
  const scenario = cleanGuidanceText(
    [
      ...(packetEvidence.scenarios[0]?.mainTokens || []).slice(0, 2),
      ...(packetEvidence.scenarios[0]?.altTokens || []).slice(0, 1),
    ].join(', '),
    48
  )
  const actionCue = buildSlotActionCue({ locale, tone, slotTypes, category })
  const timingBrief = cleanGuidanceText(buildCanonicalTimingBrief(calendar, locale), 108)
  const preferOriginalNote = source === 'rag' || source === 'hybrid'

  if (locale === 'ko') {
    const parts = [
      preferOriginalNote ? fallbackNote || undefined : undefined,
      focusHint || undefined,
      phase ? `흐름 ${phase}` : undefined,
      timingBrief || undefined,
      actionCue,
      claim || undefined,
      anchor ? `근거: ${anchor}` : scenario ? `시나리오: ${scenario}` : undefined,
    ].filter(Boolean)
    return cleanGuidanceText(parts.join(' · ') || fallbackNote || '기본 운영 슬롯입니다.', 180)
  }

  const parts = [
    preferOriginalNote ? fallbackNote || undefined : undefined,
    focusHint || undefined,
    phase ? `Flow ${phase}` : undefined,
    timingBrief || undefined,
    actionCue,
    claim || undefined,
    anchor ? `Basis: ${anchor}` : scenario ? `Scenario: ${scenario}` : undefined,
  ].filter(Boolean)
  return cleanGuidanceText(parts.join(' · ') || fallbackNote || 'Baseline operating slot.', 180)
}

export function analyzeConfidenceMeta(input: {
  locale: 'ko' | 'en'
  slot: TimelineSlot
  calendar?: ActionPlanCalendarContext
  baselineConfidence?: number
  why: SlotWhy
}): { score: number; reasons: string[] } {
  const { locale, slot, calendar, baselineConfidence, why } = input
  const isKo = locale === 'ko'
  const packet = getMatrixPacket(calendar)
  const canonical = getCanonicalCore(calendar)
  const base = typeof baselineConfidence === 'number' ? baselineConfidence : 62
  const toneDelta = slot.tone === 'best' ? 14 : slot.tone === 'caution' ? -18 : 0
  const sourceDelta = slot.source === 'hybrid' ? 8 : slot.source === 'rag' ? 4 : 0
  const evidenceDelta = Math.min(8, (slot.evidenceSummary?.length || 0) * 3)
  const packetAnchorCount = packet?.graphRagEvidenceSummary?.totalAnchors ?? 0
  const packetSetCount = packet?.graphRagEvidenceSummary?.totalSets ?? 0
  const packetSignalCount = packet?.selectedSignals?.length ?? 0
  const packetClaimCount = packet?.topClaims?.length ?? 0
  const bestHit = (calendar?.bestTimes || []).some((time) =>
    extractHoursFromText(time).includes(slot.hour)
  )
  const warningHit = (calendar?.warnings || []).some((line) =>
    extractHoursFromText(line).includes(slot.hour)
  )
  const bestBonus = bestHit ? 4 : 0
  const cautionPenalty = warningHit ? -6 : 0
  const packetBonus = canonical ? 0 : Math.min(10, packetSetCount + Math.min(4, packetClaimCount))

  const reasons: string[] = []
  if (bestHit && warningHit) reasons.push(isKo ? '근거 충돌' : 'Evidence conflict')
  if (why.anchorIds.length < 1 || (!canonical && packetAnchorCount < 1))
    reasons.push(isKo ? 'anchor 부족' : 'Anchor shortage')
  if (why.signalIds.length < 3 || (!canonical && packetSignalCount < 3))
    reasons.push(isKo ? 'signal 밀도 낮음' : 'Low signal density')
  if (slot.tone === 'caution') reasons.push(isKo ? '리스크 구간' : 'Risk window')
  if (base < 55) reasons.push(isKo ? '기본 신뢰도 낮음' : 'Low baseline confidence')
  if (reasons.length === 0) reasons.push(isKo ? '신호 정렬 양호' : 'Signals aligned')

  return {
    score: clampPercent(
      base + toneDelta + sourceDelta + evidenceDelta + bestBonus + cautionPenalty + packetBonus
    ),
    reasons: reasons.slice(0, 3),
  }
}

export function buildDeltaToday(input: {
  locale: 'ko' | 'en'
  timeline: TimelineSlot[]
  calendar?: ActionPlanCalendarContext
}): string {
  const { locale, timeline, calendar } = input
  const canonical = getCanonicalCore(calendar)
  const bestCount = timeline.filter((slot) => slot.tone === 'best').length
  const cautionCount = timeline.filter((slot) => slot.tone === 'caution').length
  const avgConfidence =
    timeline.length > 0
      ? Math.round(
          timeline.reduce(
            (sum, slot) => sum + (typeof slot.confidence === 'number' ? slot.confidence : 60),
            0
          ) / timeline.length
        )
      : 60

  const topClaim = cleanGuidanceText(canonical?.topDecisionLabel || canonical?.thesis || '', 88)
  const verdict = getMatrixVerdict(calendar)
  const primaryLine = topClaim || cleanGuidanceText(verdict?.verdict || '', 88)
  const attack = canonical?.attackPercent ?? verdict?.attackPercent ?? 0
  const defense = canonical?.defensePercent ?? verdict?.defensePercent ?? 0

  if (locale === 'ko') {
    if (attack >= defense + 15 && avgConfidence < 72) {
      return cleanGuidanceText(
        `오늘은 추진은 강한데 검증이 약해지기 쉽습니다. ${primaryLine || '큰 결정은 초안-검증-확정 3단계로 나누세요.'}`,
        140
      )
    }
    if (bestCount >= cautionCount + 2 && avgConfidence < 72) {
      return '오늘은 속도는 빠르지만 검증 누락 위험이 큽니다. 결정 1건당 검증 1회를 강제하세요.'
    }
    if (defense > attack + 10 || cautionCount > bestCount) {
      return '오늘은 외부 변수 대응일입니다. 신규 확정보다 리스크 제거와 재정렬을 우선하세요.'
    }
    return cleanGuidanceText(
      `오늘은 성과 구간과 조정 구간이 섞여 있습니다. ${primaryLine || '큰 일은 좋은 슬롯에, 조정은 주의 슬롯에 배치하세요.'}`,
      140
    )
  }

  if (attack >= defense + 15 && avgConfidence < 72) {
    return cleanGuidanceText(
      `Today pushes speed faster than validation. ${primaryLine || 'Split major moves into draft, validation, and commit.'}`,
      140
    )
  }
  if (bestCount >= cautionCount + 2 && avgConfidence < 72) {
    return 'Today is fast but under-validated. Force one validation pass per major decision.'
  }
  if (defense > attack + 10 || cautionCount > bestCount) {
    return 'Today is variable-heavy. Prioritize risk removal and re-alignment over new commitments.'
  }
  return cleanGuidanceText(
    `Today mixes strong and caution windows. ${primaryLine || 'Place big tasks in strong slots and adjustments in caution slots.'}`,
    140
  )
}

export function buildActionPlanInsights(input: {
  locale: 'ko' | 'en'
  timeline: TimelineSlot[]
  calendar?: ActionPlanCalendarContext
  icp?: ActionPlanIcpProfile
  persona?: ActionPlanPersonaProfile
  isPremiumUser: boolean
}): ActionPlanInsights {
  const { locale, timeline, calendar, icp, persona, isPremiumUser } = input
  const isKo = locale === 'ko'
  const canonical = getCanonicalCore(calendar)
  const actionDomain = getCanonicalActionDomain(calendar)
  const branchProjection = getCanonicalBranchProjection(calendar)
  const verdict = getMatrixVerdict(calendar)
  const bestSlot = timeline.find((slot) => slot.tone === 'best')
  const cautionSlot = timeline.find((slot) => slot.tone === 'caution')
  const topCategory = normalizeActionCategory(actionDomain || calendar?.categories?.[0])
  const topClaim = cleanGuidanceText(
    canonical?.topDecisionLabel || canonical?.thesis || verdict?.topClaim || '',
    110
  )
  const topAnchor = cleanGuidanceText(
    canonical?.riskControl ||
      canonical?.judgmentPolicy?.rationale ||
      verdict?.topAnchorSummary ||
      '',
    96
  )
  const phaseLabel = cleanGuidanceText(
    canonical?.phaseLabel || canonical?.phase || verdict?.phase || '',
    48
  )
  const allowedActionCopy = formatDecisionActionLabels(
    canonical?.judgmentPolicy?.allowedActionLabels?.length
      ? canonical.judgmentPolicy.allowedActionLabels
      : canonical?.judgmentPolicy?.allowedActions || [],
    locale,
    false
  )
  const blockedActionCopy = formatDecisionActionLabels(
    canonical?.judgmentPolicy?.blockedActionLabels?.length
      ? canonical.judgmentPolicy.blockedActionLabels
      : canonical?.judgmentPolicy?.blockedActions || [],
    locale,
    true
  )
  const softCheckCopy = formatPolicyCheckLabels(
    canonical?.judgmentPolicy?.softCheckLabels?.length
      ? canonical.judgmentPolicy.softCheckLabels
      : canonical?.judgmentPolicy?.softChecks || []
  )
  const hardStopCopy = formatPolicyCheckLabels(
    canonical?.judgmentPolicy?.hardStopLabels?.length
      ? canonical.judgmentPolicy.hardStopLabels
      : canonical?.judgmentPolicy?.hardStops || []
  )
  const timingBrief = cleanGuidanceText(buildCanonicalTimingBrief(calendar, locale), 140)
  const branchLead = cleanGuidanceText(
    branchProjection?.detailLines?.[0] ||
      branchProjection?.summary ||
      branchProjection?.nextMoves?.[0] ||
      '',
    120
  )
  const riskAxisLead = cleanGuidanceText(
    canonical?.riskAxisLabel
      ? isKo
        ? `${canonical.riskAxisLabel} 축 리스크를 먼저 관리`
        : `Manage the ${canonical.riskAxisLabel} risk axis first.`
      : '',
    96
  )

  const formatSlotLabel = (slot?: TimelineSlot) =>
    slot
      ? `${String(slot.hour).padStart(2, '0')}:${String(slot.minute ?? 0).padStart(2, '0')}`
      : '-'
  const unique = (lines: Array<string | null | undefined>, max = 4) =>
    Array.from(
      new Set(lines.map((line) => cleanGuidanceText(line || '', 140)).filter(Boolean))
    ).slice(0, max)

  const ifThenRules = unique([
    topClaim
      ? isKo
        ? `IF 핵심 신호 체감 THEN ${topClaim} 기준으로 초안→검증→확정 순서를 유지`
        : `If the core signal spikes, keep draft -> validate -> commit around: ${topClaim}`
      : null,
    bestSlot
      ? isKo
        ? `IF ${formatSlotLabel(bestSlot)} 시작 THEN 25분 내 초안/산출물 1개 저장`
        : `If you start at ${formatSlotLabel(bestSlot)}, lock the first output within 25 minutes.`
      : null,
    cautionSlot
      ? isKo
        ? `IF ${formatSlotLabel(cautionSlot)} 결정 요청 THEN 10분 유예 + 체크리스트(목표/비용/리스크) 3항목 확인`
        : `If a decision is needed at ${formatSlotLabel(cautionSlot)}, delay 10 minutes and validate 3 checklist points.`
      : null,
    topCategory === 'wealth'
      ? isKo
        ? 'IF 지출/투자 집행 THEN 총액·한도·최악손실 숫자 3개 확인 후 진행'
        : 'If spending/investing, confirm total-limit-worst loss before execution.'
      : topCategory === 'love'
        ? isKo
          ? 'IF 민감 대화 시작 THEN 사실 1줄 먼저, 감정 표현은 그다음'
          : 'If starting a sensitive talk, state one fact first, then emotion.'
        : isKo
          ? 'IF 작업 착수 THEN 종료 조건 1줄 기록 후 시작'
          : 'If starting work, write one done-condition before execution.',
    branchLead
      ? isKo
        ? `IF 분기 조건이 갈리면 THEN ${branchLead}`
        : `If branch conditions diverge, follow this first: ${branchLead}`
      : null,
  ])

  if (softCheckCopy[0]) {
    ifThenRules.unshift(
      isKo
        ? `IF 실행 전 확인 THEN ${softCheckCopy[0]}`
        : `Before execution, check this first: ${softCheckCopy[0]}`
    )
  }
  if (timingBrief) {
    ifThenRules.unshift(
      isKo
        ? `IF \uD0C0\uC774\uBC0D \uD574\uC11D THEN ${timingBrief}`
        : `Timing read: ${timingBrief}`
    )
  }

  const situationTriggers = unique(
    [
      phaseLabel
        ? isKo
          ? `현재 흐름(${phaseLabel})이 흔들리면 즉시 속도를 낮추고 다시 맞추세요`
          : `If the current flow (${phaseLabel}) feels unstable, slow down and realign first`
        : null,
      isKo
        ? '피로 7/10 이상: 신규 결정 중단, 20분 회복 후 재평가'
        : 'If fatigue >= 7/10: pause new decisions and run the validation checklist first',
      isKo
        ? '10분 내 요청 3건 이상 유입: 즉답 금지, 우선순위 재정렬'
        : 'If 3+ incoming requests cluster: re-prioritize before replying fast',
      isKo
        ? '예상 외 지출 유혹 발생: 24시간 보류 후 재승인'
        : 'If spending/investment urge appears: validate amount-limit-alternative before action',
      isKo
        ? '요구사항이 1시간 내 2회 이상 변경: 확정 전 문서화'
        : 'If requirements change twice within an hour: document before commitment',
      typeof icp?.dominanceScore === 'number' && icp.dominanceScore >= 70
        ? isKo
          ? '속도 욕구 급상승: 반대 근거 1개 수집 전 결론 금지'
          : 'If drive spikes: force-collect one counter-evidence'
        : null,
      persona?.challenges?.[0]
        ? isKo
          ? `반복 약점(${persona.challenges[0]}) 신호 감지: 고난도 작업 중단 후 저리스크 대체안 실행`
          : `If recurring weakness (${persona.challenges[0]}) appears: switch to low-risk fallback immediately`
        : null,
    ],
    5
  )

  if (hardStopCopy[0]) {
    situationTriggers.unshift(
      isKo ? `즉시 중단 조건: ${hardStopCopy[0]}` : `Immediate stop condition: ${hardStopCopy[0]}`
    )
  }

  if (riskAxisLead) {
    situationTriggers.unshift(riskAxisLead)
  }
  if (branchLead) {
    situationTriggers.push(branchLead)
  }

  const cautionSlots = timeline
    .filter((slot) => slot.tone === 'caution')
    .slice(0, 3)
    .map((slot) => formatSlotLabel(slot))
  const riskTriggers = unique(
    [
      riskAxisLead || null,
      topAnchor
        ? isKo
          ? `핵심 앵커 이탈: ${topAnchor}`
          : `Anchor drift detected: ${topAnchor}`
        : null,
      cautionSlots.length
        ? isKo
          ? `주의 시간대 집중: ${cautionSlots.join(', ')}`
          : `Caution windows concentrated: ${cautionSlots.join(', ')}`
        : null,
      (calendar?.warnings || [])[0]
        ? isKo
          ? `반복 리스크: ${(calendar?.warnings || [])[0]}`
          : `Repeated risk: ${(calendar?.warnings || [])[0]}`
        : null,
      isKo
        ? '근거 충돌(좋은 시간+주의 신호 동시): 최종 확정 지연'
        : 'If evidence conflict occurs (best-time + warning overlap), delay finalization',
      isKo
        ? '근거 신호가 약한 슬롯은 확정보다 초안/검증 작업으로 전환'
        : 'When evidence is weak, switch from final decisions to draft/validation tasks',
    ],
    4
  )

  const avgConfidence =
    timeline.length > 0
      ? Math.round(
          timeline.reduce(
            (acc, slot) => acc + (typeof slot.confidence === 'number' ? slot.confidence : 60),
            0
          ) / timeline.length
        )
      : 60
  const bestCount = timeline.filter((slot) => slot.tone === 'best').length

  const actionFramework = {
    do: unique(
      [
        (calendar?.recommendations || [])[0],
        branchProjection?.nextMoves?.[0],
        isKo ? `${topCategory} 영역 핵심 액션 1건 완료` : `Complete one key ${topCategory} action`,
        isKo ? '시작 전 완료 기준 1줄 작성' : 'Write one done-condition before start',
        isKo
          ? '작업 종료 직후 결과 로그 1줄 기록'
          : 'Log one result line immediately after completion',
      ],
      4
    ),
    dont: unique(
      [
        (calendar?.warnings || [])[0],
        isKo ? '근거 없는 즉흥 결정 금지' : 'No impulsive decision without evidence',
        isKo ? '주의 슬롯에서 확정 결론 금지' : 'No final decisions in caution slots',
        isKo ? '멀티태스킹 3개 이상 동시 진행 금지' : 'No 3+ parallel tasks at the same time',
      ],
      4
    ),
    alternative: unique(
      [
        cautionSlot
          ? isKo
            ? `${formatSlotLabel(cautionSlot)}에는 결정보다 초안 작성/검증 작업으로 대체`
            : `At ${formatSlotLabel(cautionSlot)}, switch from decision to draft/validation work`
          : null,
        bestSlot
          ? isKo
            ? `${formatSlotLabel(bestSlot)}에는 핵심 1건만 완수하고 로그 기록`
            : `At ${formatSlotLabel(bestSlot)}, complete one key action and log it`
          : null,
        isPremiumUser
          ? isKo
            ? '리스크 감지 시 3단계 복구(중단-정렬-재개) 적용'
            : 'Use 3-step recovery (pause-align-resume) when risk is detected'
          : null,
      ],
      4
    ),
  }

  if (allowedActionCopy[0]) actionFramework.do.unshift(allowedActionCopy[0])
  if (softCheckCopy[0]) actionFramework.do.push(softCheckCopy[0])
  if (blockedActionCopy[0]) actionFramework.dont.unshift(blockedActionCopy[0])
  if (hardStopCopy[0]) actionFramework.dont.push(hardStopCopy[0])
  if (allowedActionCopy[1]) actionFramework.alternative.push(allowedActionCopy[1])

  const successKpi = unique(
    [
      isKo
        ? `평균 슬롯 신뢰도 ${avgConfidence}% 이상`
        : `Average slot confidence >= ${avgConfidence}%`,
      isKo
        ? `핵심 액션 완료 ${Math.max(1, Math.min(3, bestCount))}건`
        : `Complete ${Math.max(1, Math.min(3, bestCount))} core actions`,
      isKo ? '주의 슬롯에서 확정 의사결정 0건' : 'Zero final decisions in caution slots',
      isKo ? '체크리스트 실행률 100%' : 'Checklist execution rate 100%',
    ],
    4
  )

  return {
    ifThenRules,
    situationTriggers,
    actionFramework,
    riskTriggers,
    successKpi,
    deltaToday: buildDeltaToday({ locale, timeline, calendar }),
  }
}

export const buildRuleBasedTimeline = (input: {
  date: string
  locale: 'ko' | 'en'
  intervalMinutes: 30 | 60
  icp?: ActionPlanIcpProfile
  persona?: ActionPlanPersonaProfile
  calendar?: ActionPlanCalendarContext
}): TimelineSlot[] => {
  const { date, locale, intervalMinutes, calendar, icp, persona } = input
  const [year, month, day] = date.split('-').map(Number)
  const dateValue = new Date(Date.UTC(year, month - 1, day))
  const weekdayIndex = Number.isNaN(dateValue.getTime()) ? 1 : dateValue.getUTCDay()

  const daily = calculateDailyPillar(dateValue)
  const dayMasterElement = STEM_ELEMENTS[daily.stem] || 'wood'

  const bestHours = new Set<number>()
  calendar?.bestTimes?.forEach((time) => {
    extractHoursFromText(time).forEach((hour) => bestHours.add(hour))
  })

  const cautionHours = new Set<number>()
  calendar?.warnings?.forEach((warning) => {
    extractHoursFromText(warning).forEach((hour) => cautionHours.add(hour))
  })
  if (getEffectiveCalendarGrade(calendar) >= 3) {
    cautionHours.add(13)
    cautionHours.add(21)
  }

  const hourlyAdvice = generateHourlyAdvice(daily.stem, daily.branch)
  const slots: TimelineSlot[] = []
  const slotsPerHour = intervalMinutes === 30 ? 2 : 1

  for (let hour = 0; hour < 24; hour++) {
    for (let slotIdx = 0; slotIdx < slotsPerHour; slotIdx++) {
      const minute = slotIdx === 0 ? 0 : 30
      const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

      const energyText = getHourlyWindowLabel(hour, locale)

      const hourlyRec = getHourlyRecommendation(hour, weekdayIndex, dayMasterElement)
      const advice = hourlyAdvice[hour]
      let tone: TimelineTone =
        advice?.quality === 'excellent'
          ? 'best'
          : advice?.quality === 'caution'
            ? 'caution'
            : 'neutral'

      if (bestHours.has(hour)) {
        tone = 'best'
      }
      if (cautionHours.has(hour)) {
        tone = 'caution'
      }

      const category = pickCategoryByHour(calendar?.categories, hour)
      const focusHint = getCategoryFocusHint(category, hour, locale)
      const recHint = cleanGuidanceText(pickByHour(calendar?.recommendations, hour) || '', 78)
      const warningHint = cleanGuidanceText(pickByHour(calendar?.warnings, hour) || '', 78)
      const matrixPacketSummary = summarizeMatrixPacketForPrompt(getMatrixPacket(calendar), locale)
      const matrixVerdictSummary = summarizeMatrixVerdictForPrompt(calendar, locale)
      const matrixSummary =
        matrixVerdictSummary ||
        matrixPacketSummary ||
        (typeof calendar?.evidence?.confidence === 'number'
          ? `Signals: confidence ${calendar.evidence.confidence}%`
          : null)
      const primaryAstroLine =
        pickCrossLineByTone(calendar?.evidence?.cross?.astroDetails, tone) ||
        cleanGuidanceText(calendar?.evidence?.cross?.astroEvidence || '', 112)
      const primaryBridgeLine =
        pickCrossLineByTone(calendar?.evidence?.cross?.bridges, tone) ||
        [calendar?.sajuFactors?.[0], calendar?.astroFactors?.[0]]
          .map((line) => cleanGuidanceText(line || '', 96))
          .filter(Boolean)
          .join(' / ')
      const crossReason = buildCrossReasonText(calendar?.evidence?.cross, tone, locale)
      const crossSummary =
        primaryAstroLine ||
        primaryBridgeLine ||
        cleanGuidanceText(calendar?.evidence?.cross?.sajuDetails?.[0] || '', 112)
      const personalHint = buildPersonalizationHint({ locale, tone, icp, persona })

      const best = hourlyRec.bestActivities.slice(0, 2).join(', ')
      const avoid = hourlyRec.avoidActivities.slice(0, 2).join(', ')

      let detailLine = ''
      if (locale === 'ko') {
        if (tone === 'caution') {
          detailLine = `${focusHint}. ${
            warningHint ? `주의 포인트: ${warningHint}` : `주의: ${avoid || '무리한 결정'}`
          }`
        } else {
          detailLine = `${focusHint}. ${
            recHint ? `실행: ${recHint}` : `추천: ${best || '핵심 업무'}`
          }`
        }
        if (personalHint) {
          detailLine = `${detailLine}. 개인화: ${personalHint}`
        }
      } else {
        if (tone === 'caution') {
          detailLine = `${focusHint}. ${
            warningHint ? `Watch-out: ${warningHint}` : 'Avoid high-risk decisions right now'
          }.`
        } else {
          detailLine = `${focusHint}. ${recHint ? `Action: ${recHint}` : 'Action: do one focused task'}.`
        }
        if (personalHint) {
          detailLine = `${detailLine} Personalized: ${personalHint}.`
        }
      }

      const noteParts = [
        cleanGuidanceText(energyText, 54),
        cleanGuidanceText(detailLine, 108),
        crossReason,
      ]
        .filter(Boolean)
        .slice(0, 3)
      const note = repairMojibakeText(noteParts.join(' \u00b7 ').trim())
      const evidenceSummary = Array.from(
        new Set(
          [
            cleanGuidanceText(matrixSummary || 'Matrix baseline evidence', 90),
            cleanGuidanceText(crossSummary || 'Cross evidence: baseline saju/astro flow', 124),
            cleanGuidanceText(
              personalHint
                ? locale === 'ko'
                  ? `개인화 근거: ${personalHint}`
                  : `Personalized basis: ${personalHint}`
                : primaryBridgeLine || '',
              124
            ),
          ].filter(Boolean)
        )
      ).slice(0, 3)
      slots.push({ hour, minute, label, note, tone, evidenceSummary, source: 'rule' })
    }
  }

  return slots
}
