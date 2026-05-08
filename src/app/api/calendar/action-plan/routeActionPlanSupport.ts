import { repairMojibakeText } from '@/lib/text/mojibake'
import { adaptAdviceTone } from '@/lib/destiny-matrix/personality'
import { calculateDailyPillar, generateHourlyAdvice } from '@/lib/prediction/ultra-precision-daily'
import { STEM_ELEMENTS } from '@/lib/counselor/config/specialDays.data'
import { getHourlyRecommendation } from '@/lib/counselor/calendar/specialDays-analysis'
import {
  formatDecisionActionLabels,
  formatPolicyCheckLabels,
} from '@/lib/destiny-matrix/core/actionCopy'

import {
  buildActivityMatchLine,
  buildCrossReasonText,
  buildHourSajuLine,
  buildPlanetaryHourLine,
  clampPercent,
  cleanGuidanceText,
  extractHoursFromText,
  getCategoryFocusHint,
  getOfficeBucket,
  getOfficeBucketAction,
  getOfficeBucketTheme,
  normalizeActionCategory,
  pickByHour,
  pickCategoryByHour,
  pickCrossLineByTone,
  type TimelineTone,
} from './routeActionPlanCommon'
import type {
  ActionPlanCalendarContext,
  ActionPlanIcpProfile,
  ActionPlanInsights,
  ActionPlanPersonaProfile,
  SlotType,
  SlotWhy,
  TimelineSlot,
} from './routeActionPlanSupport.types'
import {
  buildCanonicalTimingBrief,
  buildSingleSubjectBranchLead,
  getAppliedProfileLead,
  getDomainStateLead,
  getEventOutlookLead,
  derivePacketPatterns,
  getCanonicalActionDomain,
  getCanonicalBranchProjection,
  getCanonicalCore,
  getCanonicalSingleSubjectView,
  getEffectiveCalendarGrade,
  getMatrixPacket,
  getMatrixVerdict,
  getRelevantPacketEvidence,
  summarizeMatrixPacketForPrompt,
  summarizeMatrixVerdictForPrompt,
} from './routeActionPlanMatrixSupport'

export {
  clampPercent,
  cleanGuidanceText,
  extractHoursFromText,
  pickCategoryByHour,
  trimList,
} from './routeActionPlanCommon'
export type {
  ActionPlanCalendarContext,
  ActionPlanIcpProfile,
  ActionPlanInsights,
  ActionPlanPersonaProfile,
  SlotType,
  SlotWhy,
  TimelineSlot,
} from './routeActionPlanSupport.types'
export {
  buildCanonicalTimingBrief,
  buildSingleSubjectBranchLead,
  buildSlotDomainHints,
  derivePacketPatterns,
  domainMatchesHints,
  getAppliedProfileLead,
  getCanonicalActionDomain,
  getCanonicalBranchProjection,
  getCanonicalCore,
  getCanonicalPersonModel,
  getCanonicalSingleSubjectView,
  getDomainStateLead,
  getEffectiveCalendarGrade,
  getEffectiveCalendarScore,
  getEventOutlookLead,
  getMatrixPacket,
  getMatrixVerdict,
  getRelevantPacketEvidence,
  normalizePacketDomain,
  summarizeMatrixPacketForPrompt,
  summarizeMatrixVerdictForPrompt,
} from './routeActionPlanMatrixSupport'

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

export function buildPersonalizationHint(input: {
  locale: 'ko' | 'en'
  tone: TimelineTone
  icp?: ActionPlanIcpProfile
  persona?: ActionPlanPersonaProfile
}): string {
  const { locale, tone, icp, persona } = input
  const hints: string[] = []

  if ((icp?.dominanceScore || 0) >= 70) {
    hints.push(
      locale === 'ko'
        ? tone === 'caution'
          ? '결론을 미루고 체크리스트부터 검증하세요.'
          : '1차 결론을 빠르게 내고 후속 보완으로 마무리하세요.'
        : tone === 'caution'
          ? 'Delay the final decision and validate the checklist first.'
          : 'Lock the first decision, then finish with follow-up refinement.'
    )
  } else if ((icp?.dominanceScore || 100) <= 35) {
    hints.push(
      locale === 'ko'
        ? '의사결정 전에 기준 두세 개를 먼저 고정하세요.'
        : 'Fix two or three decision criteria before acting.'
    )
  }

  if ((icp?.affiliationScore || 0) >= 70) {
    hints.push(
      locale === 'ko'
        ? '핵심 관계자 한 명에게 먼저 공유해 오해를 줄이세요.'
        : 'Pre-brief one key stakeholder to reduce misunderstanding.'
    )
  }

  const decisionPole = persona?.axes?.decision?.pole
  if (decisionPole === 'logic') {
    hints.push(
      locale === 'ko'
        ? '판단은 감각보다 수치 두 개를 기준으로 두세요.'
        : 'Anchor decisions on two concrete metrics over intuition.'
    )
  } else if (decisionPole === 'empathic') {
    hints.push(
      locale === 'ko'
        ? '결정 전에 상대 영향 한 가지를 먼저 확인하세요.'
        : 'Check one human-impact factor before deciding.'
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
  if (icp?.primaryStyle) tokens.push(`ICP ${icp.primaryStyle}`)
  if (persona?.personaName) {
    tokens.push(locale === 'ko' ? `페르소나 ${persona.personaName}` : `Persona ${persona.personaName}`)
  } else if (persona?.typeCode) {
    tokens.push(locale === 'ko' ? `페르소나 ${persona.typeCode}` : `Persona ${persona.typeCode}`)
  }
  if (tokens.length === 0) return null
  return locale === 'ko' ? `개인화: ${tokens.join(', ')}` : `Personalization: ${tokens.join(', ')}`
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
    const composed = cleanGuidanceText(
      parts.join(' · ') || fallbackNote || '기본 운영 슬롯입니다.',
      180
    )
    if (composed) return composed
    return (
      cleanGuidanceText(repairMojibakeText(fallbackNote || ''), 180) ||
      cleanGuidanceText(
        repairMojibakeText(`${focusHint || '핵심 흐름'} · ${actionCue || '기본 운영 슬롯입니다.'}`),
        180
      ) ||
      '기본 운영 슬롯입니다.'
    )
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
  const composed = cleanGuidanceText(
    parts.join(' · ') || fallbackNote || 'Baseline operating slot.',
    180
  )
  if (composed) return composed
  return (
    cleanGuidanceText(repairMojibakeText(fallbackNote || ''), 180) ||
    cleanGuidanceText(
      repairMojibakeText(
        `${focusHint || 'Core flow'} · ${actionCue || 'Baseline operating slot.'}`
      ),
      180
    ) ||
    'Baseline operating slot.'
  )
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
  const packetAnchorCount = packet?.structuredEvidenceSummary?.totalAnchors ?? 0
  const packetSetCount = packet?.structuredEvidenceSummary?.totalSets ?? 0
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
  const singleSubjectView = getCanonicalSingleSubjectView(calendar)
  const actionDomain = getCanonicalActionDomain(calendar)
  const branchProjection = getCanonicalBranchProjection(calendar)
  const verdict = getMatrixVerdict(calendar)
  const bestSlot = timeline.find((slot) => slot.tone === 'best')
  const cautionSlot = timeline.find((slot) => slot.tone === 'caution')
  const topCategory = normalizeActionCategory(actionDomain || calendar?.categories?.[0])
  const personDomainState = getDomainStateLead(calendar, topCategory)
  const eventOutlook = getEventOutlookLead(calendar, topCategory)
  const appliedProfileLead = cleanGuidanceText(getAppliedProfileLead(calendar, topCategory), 120)
  const topClaim = cleanGuidanceText(
    singleSubjectView?.directAnswer ||
      singleSubjectView?.actionAxis.nowAction ||
      canonical?.topDecisionLabel ||
      canonical?.thesis ||
      verdict?.topClaim ||
      '',
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
    buildSingleSubjectBranchLead(calendar, locale) ||
      branchProjection?.detailLines?.[0] ||
      branchProjection?.summary ||
      branchProjection?.nextMoves?.[0] ||
      '',
    120
  )
  const riskAxisLead = cleanGuidanceText(
    singleSubjectView?.riskAxis.warning ||
      (canonical?.riskAxisLabel
        ? isKo
          ? `${canonical.riskAxisLabel} 축 리스크를 먼저 관리`
          : `Manage the ${canonical.riskAxisLabel} risk axis first.`
        : ''),
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
    singleSubjectView?.nextMove
      ? isKo
        ? `IF 지금 주축을 따른다면 THEN ${cleanGuidanceText(singleSubjectView.nextMove, 110)}`
        : `If you follow the current axis, do this next: ${cleanGuidanceText(singleSubjectView.nextMove, 110)}`
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
    eventOutlook?.nextMove
      ? isKo
        ? `IF ${eventOutlook.label} 조건이 맞으면 THEN ${cleanGuidanceText(eventOutlook.nextMove, 100)}`
        : `If ${eventOutlook.label} conditions line up, do this next: ${cleanGuidanceText(eventOutlook.nextMove, 100)}`
      : null,
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
      singleSubjectView?.abortConditions?.[0]
        ? isKo
          ? `중단 조건: ${cleanGuidanceText(singleSubjectView.abortConditions[0], 96)}`
          : `Abort condition: ${cleanGuidanceText(singleSubjectView.abortConditions[0], 96)}`
        : null,
      eventOutlook?.abortConditions?.[0]
        ? isKo
          ? `이벤트 중단 신호: ${cleanGuidanceText(eventOutlook.abortConditions[0], 96)}`
          : `Event abort signal: ${cleanGuidanceText(eventOutlook.abortConditions[0], 96)}`
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
      singleSubjectView?.riskAxis.hardStops?.[0]
        ? cleanGuidanceText(singleSubjectView.riskAxis.hardStops[0], 120)
        : null,
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
      eventOutlook?.abortConditions?.[0]
        ? cleanGuidanceText(eventOutlook.abortConditions[0], 120)
        : null,
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

  // 사주·점성 anchor — best/caution 슬롯의 evidence를 키워드로 분류해서
  // do/dont/alternative 항목에 사주·점성 *full detail*로 anchor 부여
  const SAJU_KW = ['일진', '대운', '세운', '월운', '식상', '재성', '관성', '인성', '비겁', '신살', '천을귀인', '도화', '역마', '백호', '양인', '괴강', '공망', '격국', '용신', '12운성', '천간', '지지', '오행', '갑목', '을목', '병화', '정화', '무토', '기토', '경금', '신금', '임수', '계수']
  const ASTRO_KW = ['하우스', '트랜짓', '어스펙트', 'aspect', 'transit', 'house', 'Sun', 'Moon', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'ASC', 'MC', 'Vertex', 'Juno', 'Vesta', '태양', '달', '금성', '화성', '목성', '토성', '천왕성', '해왕성', '명왕성']
  const slotEvidenceSignals = (slot?: TimelineSlot): { saju: string; astro: string; cross: string } => {
    if (!slot) return { saju: '', astro: '', cross: '' }
    const lines: string[] = [
      ...((slot.evidenceSummary as string[] | undefined) || []),
      ...((slot.confidenceReason as string[] | undefined) || []),
      ...((slot.why?.patterns as string[] | undefined) || []),
    ].map((s) => cleanGuidanceText(s, 110)).filter(Boolean)

    const saju = lines.find((ln) => SAJU_KW.some((k) => ln.includes(k)) && !ASTRO_KW.some((k) => ln.includes(k))) || ''
    const astro = lines.find((ln) => ASTRO_KW.some((k) => ln.includes(k)) && !SAJU_KW.some((k) => ln.includes(k))) || ''
    const cross = lines.find((ln) => SAJU_KW.some((k) => ln.includes(k)) && ASTRO_KW.some((k) => ln.includes(k))) || ''
    return { saju, astro, cross }
  }
  const bestSignals = slotEvidenceSignals(bestSlot)
  const cautionSignals = slotEvidenceSignals(cautionSlot)
  const formatSlotTime = (slot?: TimelineSlot): string =>
    slot ? `${String(slot.hour).padStart(2, '0')}시` : ''
  const buildAnchor = (signals: { saju: string; astro: string; cross: string }, slot?: TimelineSlot): string => {
    const parts: string[] = []
    const timeTag = formatSlotTime(slot)
    if (signals.cross) {
      // cross-line은 이미 두 시스템 묶여 있으니 그대로
      parts.push(signals.cross)
    } else {
      if (signals.saju) parts.push(isKo ? `사주: ${signals.saju}` : `Saju: ${signals.saju}`)
      if (signals.astro) parts.push(isKo ? `점성: ${signals.astro}` : `Astro: ${signals.astro}`)
    }
    if (parts.length === 0) return ''
    const joined = parts.join(isKo ? ' / ' : ' / ')
    return timeTag
      ? isKo ? `[${timeTag}] ${joined}` : `[${timeTag}] ${joined}`
      : joined
  }
  const bestAnchorText = buildAnchor(bestSignals, bestSlot)
  const cautionAnchorText = buildAnchor(cautionSignals, cautionSlot)
  const anchorBest = (text: string): string => {
    if (!text) return text
    if (!bestAnchorText) return text
    return isKo ? `${text} — 근거: ${bestAnchorText}` : `${text} — Why: ${bestAnchorText}`
  }
  const anchorCaution = (text: string): string => {
    if (!text) return text
    if (!cautionAnchorText) return text
    return isKo ? `${text} — 근거: ${cautionAnchorText}` : `${text} — Why: ${cautionAnchorText}`
  }

  const actionFramework = {
    do: unique(
      [
        anchorBest((calendar?.recommendations || [])[0] || ''),
        anchorBest(singleSubjectView?.actionAxis.nowAction || ''),
        singleSubjectView?.nextMove,
        personDomainState?.firstMove,
        eventOutlook?.nextMove,
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
        anchorCaution((calendar?.warnings || [])[0] || ''),
        anchorCaution(singleSubjectView?.riskAxis.warning || ''),
        personDomainState?.holdMove,
        isKo ? '근거 없는 즉흥 결정 금지' : 'No impulsive decision without evidence',
        isKo ? '주의 슬롯에서 확정 결론 금지' : 'No final decisions in caution slots',
        isKo ? '멀티태스킹 3개 이상 동시 진행 금지' : 'No 3+ parallel tasks at the same time',
      ],
      4
    ),
    alternative: unique(
      [
        cautionSlot
          ? anchorCaution(
              isKo
                ? `${formatSlotLabel(cautionSlot)}에는 결정보다 초안 작성/검증 작업으로 대체`
                : `At ${formatSlotLabel(cautionSlot)}, switch from decision to draft/validation work`
            )
          : null,
        personDomainState?.holdMove,
        appliedProfileLead,
        bestSlot
          ? anchorBest(
              isKo
                ? `${formatSlotLabel(bestSlot)}에는 핵심 1건만 완수하고 로그 기록`
                : `At ${formatSlotLabel(bestSlot)}, complete one key action and log it`
            )
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

  // 하루 단위 중복 안내 차단 — 같은 문장이 24시간 반복되지 않게 한 번만 노출
  const dayState = {
    activityCategoriesShown: new Set<string>(),
    warningShown: false,
    recShown: false,
  }

  for (let hour = 0; hour < 24; hour++) {
    for (let slotIdx = 0; slotIdx < slotsPerHour; slotIdx++) {
      const minute = slotIdx === 0 ? 0 : 30
      const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

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
      const recHint = cleanGuidanceText(pickByHour(calendar?.recommendations, hour) || '', 78)
      const warningHint = cleanGuidanceText(pickByHour(calendar?.warnings, hour) || '', 78)
      const matrixPacketSummary = summarizeMatrixPacketForPrompt(getMatrixPacket(calendar), locale)
      const matrixVerdictSummary = summarizeMatrixVerdictForPrompt(calendar, locale)
      const singleSubjectSummary = cleanGuidanceText(
        [
          getCanonicalSingleSubjectView(calendar)?.directAnswer,
          getCanonicalSingleSubjectView(calendar)?.actionAxis.nowAction,
          getCanonicalSingleSubjectView(calendar)?.timingState.whyNow,
        ]
          .filter(Boolean)
          .join(' · '),
        120
      )
      const matrixSummary =
        matrixVerdictSummary ||
        singleSubjectSummary ||
        matrixPacketSummary ||
        (typeof calendar?.evidence?.confidence === 'number'
          ? `Signals: confidence ${calendar.evidence.confidence}%`
          : null)
      const primaryAstroLine =
        pickCrossLineByTone(calendar?.evidence?.cross?.astroDetails, tone) ||
        cleanGuidanceText(calendar?.evidence?.cross?.astroEvidence || '', 112)
      const primaryBridgeLine =
        pickCrossLineByTone(calendar?.evidence?.cross?.bridges, tone) ||
        // sajuFactors/astroFactors 배열 전체를 일관 사용 — [0]만 쓰던 이전 동작은 나머지 신호 폐기
        [
          ...(calendar?.sajuFactors?.slice(0, 2) || []),
          ...(calendar?.astroFactors?.slice(0, 2) || []),
        ]
          .map((line) => cleanGuidanceText(line || '', 92))
          .filter(Boolean)
          .join(' / ')
      const crossReason = buildCrossReasonText(calendar?.evidence?.cross, tone, locale)
      const personalHint = buildPersonalizationHint({ locale, tone, icp, persona })

      const best = hourlyRec.bestActivities.slice(0, 2).join(', ')

      // 시진(時辰) — 본명 일주가 있으면 그 기준으로 시간 십신·시간 충/합/공망 검사
      const natalDayStem = calendar?.natalSaju?.dayStem || daily.stem
      const natalDayBranch = calendar?.natalSaju?.dayBranch || daily.branch
      const sajuHour = buildHourSajuLine({
        locale,
        hour,
        natalDayStem,
        natalDayBranch,
        gongmangBranches: calendar?.gongmangBranches,
      })
      // 시간 이벤트가 강하면 톤도 그쪽으로 당김
      if (sajuHour.event?.shift === 'press') {
        tone = 'caution'
      } else if (sajuHour.event?.shift === 'lift' && tone !== 'caution') {
        tone = 'best'
      }

      // 점성 행성시간 — 그 시간을 지배하는 행성 (Sun/Mercury/Venus 등)
      const planetaryHour = buildPlanetaryHourLine({ date, hour, locale })

      // activityScores 카테고리 매칭 — 그 시간 카테고리가 오늘 결혼/커리어/투자 중 강한 것이면 lift
      const activityMatch = buildActivityMatchLine({
        category,
        activityScores: calendar?.activityScores,
        locale,
      })
      if (activityMatch?.shift === 'lift' && tone !== 'caution') {
        tone = 'best'
      } else if (activityMatch?.shift === 'press' && tone !== 'best') {
        tone = 'caution'
      }
      // 시진(時辰)이 이미 자체 액션 풀이를 가지고 있으니, 추가 라인은 캘린더 추천/경고만 짧게 덧붙임
      // ─────────────────────────────────────────────────────────
      // 직장인 기준 슬롯 단락 (3-5문장 상담사 톤)
      // 구성: [시간대 의미] → [사주 근거] → [점성 근거] → [직장인 액션]
      // 수면(22-06)은 짧게 회복 톤, 업무 액션 X
      // ─────────────────────────────────────────────────────────
      const officeBucket = getOfficeBucket(hour)
      const isSleep = officeBucket === 'sleep'
      let note: string

      if (locale === 'ko') {
        if (isSleep) {
          // 시간대별로 자연스럽게 변화하는 수면 안내
          let leadLine: string
          if (hour === 22) leadLine = '하루 마무리하고 슬슬 잘 준비 하실 시간이에요. 핸드폰 내려놓고 호흡 가다듬어 보세요.'
          else if (hour === 23) leadLine = '이미 늦은 시간이에요. 더 늦기 전에 잠자리 드시는 게 내일 컨디션에 도움 돼요.'
          else if (hour === 0) leadLine = '자정이에요. 안 주무시면 내일 흐름이 무거워질 수 있으니 정리하시고 누우세요.'
          else if (hour >= 1 && hour <= 3) leadLine = '깊이 잠들어 있을 시간이에요. 이때 잘 자야 사주에서 말하는 본명 기운이 회복돼요.'
          else if (hour === 4) leadLine = '몸이 가장 쉬는 시간이에요. 알람 전까지 깊은 잠 유지하세요.'
          else leadLine = '곧 일어나야 할 시간이라 마지막 회복 구간이에요. 너무 일찍 깨지 마세요.'

          const sleepLines: string[] = [leadLine]
          if (sajuHour.event?.kind === '천간충' || sajuHour.event?.kind === '지지충' || sajuHour.event?.kind === '공망' || sajuHour.event?.kind === '지지형') {
            sleepLines.push('오늘은 좀 무거운 흐름이라 평소보다 일찍 푹 자는 게 더 좋아요.')
          } else if (sajuHour.event?.kind === '천간합' || sajuHour.event?.kind === '지지합') {
            sleepLines.push('마음 편히 잠들기 좋은 시간대예요. 깊이 잘 수 있을 거예요.')
          }
          note = repairMojibakeText(sleepLines.join(' '))
        } else {
          const bucketTheme = getOfficeBucketTheme(officeBucket)
          const sajuReason = `${sajuHour.line}`
          // 점성 prefix 변형 풀 — 같은 24시간 안에 단조롭지 않게
          const astroPrefixes = ['점성으로 보면', '하늘 흐름은', '오늘 행성 기운은', '서양 점성으론']
          const astroPrefix = astroPrefixes[hour % astroPrefixes.length]
          const astroReason = planetaryHour?.ko ? `${astroPrefix} ${planetaryHour.ko}예요.` : ''
          // activityMatch는 카테고리당 하루 한 번만 — 24시간 반복 차단
          let activityNote = ''
          if (activityMatch?.line && !dayState.activityCategoriesShown.has(category)) {
            dayState.activityCategoriesShown.add(category)
            activityNote = `${activityMatch.line}.`
          }
          let action = getOfficeBucketAction(officeBucket, tone)
          // 하루 단위 경고/추천은 첫 등장 슬롯에서만 — 같은 문장 반복 차단
          // + 06:00 같은 첫 슬롯이 너무 길어지지 않도록, activityNote가 있는 슬롯에선 추천/경고는 다음 슬롯으로 미룸
          const hasActivityNote = activityNote.length > 0
          if (tone === 'caution' && warningHint && !dayState.warningShown && !hasActivityNote) {
            dayState.warningShown = true
            const cleaned = warningHint.replace(/^오늘은\s*/, '')
            action = `${action} ${cleaned}`
          } else if (tone !== 'caution' && recHint && !dayState.recShown && !hasActivityNote) {
            dayState.recShown = true
            const cleaned = recHint.replace(/^오늘은\s*/, '')
            action = `${action} ${cleaned}`
          }
          if (personalHint) {
            action = `${action} (${personalHint})`
          }
          // 인격 fingerprint가 있으면 action 부분만 톤 변형 (전체 단락 변형은 길이 폭증)
          if (calendar?.personalityProfile) {
            try {
              action = adaptAdviceTone(action, calendar.personalityProfile, {})
            } catch {
              // adapter 에러 시 원본 유지
            }
          }
          const sentences = [`${bucketTheme}.`, sajuReason, astroReason, activityNote, action]
            .filter((s) => s && s.trim().length > 0)
          note = repairMojibakeText(sentences.join(' '))
        }
      } else {
        let detailLine = ''
        if (tone === 'caution') {
          detailLine = warningHint ? `Watch-out: ${warningHint}` : 'Avoid high-risk decisions'
        } else if (recHint) {
          detailLine = `Today's action: ${recHint}`
        } else if (best) {
          detailLine = `Lean into: ${best}`
        }
        if (personalHint) {
          detailLine = detailLine ? `${detailLine} (${personalHint})` : `Personalized: ${personalHint}`
        }
        const planetaryLine = planetaryHour ? planetaryHour.en : ''
        const activityLine = activityMatch?.line || ''
        const noteParts = [
          cleanGuidanceText(sajuHour.line, 132),
          cleanGuidanceText(planetaryLine, 96),
          cleanGuidanceText(activityLine, 96),
          cleanGuidanceText(detailLine, 108),
          crossReason,
        ].filter(Boolean).slice(0, 4)
        note = repairMojibakeText(noteParts.join(' \u00b7 ').trim())
      }
      // 사주 detail (십신/신살/용신) 라인을 따로 잡아 슬롯에서도 노출
      const sajuDetailLine =
        pickCrossLineByTone(calendar?.evidence?.cross?.sajuDetails, tone) ||
        cleanGuidanceText(calendar?.evidence?.cross?.sajuEvidence || '', 124) ||
        cleanGuidanceText(calendar?.sajuFactors?.[0] || '', 124)
      const astroDetailLine =
        primaryAstroLine ||
        cleanGuidanceText(calendar?.astroFactors?.[0] || '', 124)
      const evidenceSummary = Array.from(
        new Set(
          [
            cleanGuidanceText(sajuDetailLine, 124),
            cleanGuidanceText(astroDetailLine, 124),
            cleanGuidanceText(matrixSummary || 'Matrix baseline evidence', 90),
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
      ).slice(0, 4)
      slots.push({ hour, minute, label, note, tone, evidenceSummary, source: 'rule' })
    }
  }

  return slots
}
