import { repairMojibakeText } from '@/lib/text/mojibake'
import { calculateDailyPillar, generateHourlyAdvice } from '@/lib/prediction/ultra-precision-daily'
import { STEM_ELEMENTS } from '@/lib/destiny-map/config/specialDays.data'
import { getHourlyRecommendation } from '@/lib/destiny-map/calendar/specialDays-analysis'
import {
  formatDecisionActionLabels,
  formatPolicyCheckLabels,
} from '@/lib/destiny-matrix/core/actionCopy'

import {
  buildCrossReasonText,
  clampPercent,
  cleanGuidanceText,
  extractHoursFromText,
  getCategoryFocusHint,
  getHourlyWindowLabel,
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
          ? '?? ??? ??? ??????? ?????.'
          : '1? ??? ?? ???? ?? ???? ??????.'
        : tone === 'caution'
          ? 'Delay the final decision and validate the checklist first.'
          : 'Lock the first decision, then finish with follow-up refinement.'
    )
  } else if ((icp?.dominanceScore || 100) <= 35) {
    hints.push(
      locale === 'ko'
        ? '???? ?? ?? ?? ?? ?? ?????.'
        : 'Fix two or three decision criteria before acting.'
    )
  }

  if ((icp?.affiliationScore || 0) >= 70) {
    hints.push(
      locale === 'ko'
        ? '?? ??? ? ??? ?? ??? ??? ????.'
        : 'Pre-brief one key stakeholder to reduce misunderstanding.'
    )
  }

  const decisionPole = persona?.axes?.decision?.pole
  if (decisionPole === 'logic') {
    hints.push(
      locale === 'ko'
        ? '???? ??? ?? ? ?? ???? ???.'
        : 'Anchor decisions on two concrete metrics over intuition.'
    )
  } else if (decisionPole === 'empathic') {
    hints.push(
      locale === 'ko'
        ? '?? ?? ?? ?? ? ??? ?? ?????.'
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
    tokens.push(locale === 'ko' ? `???? ${persona.personaName}` : `Persona ${persona.personaName}`)
  } else if (persona?.typeCode) {
    tokens.push(locale === 'ko' ? `???? ${persona.typeCode}` : `Persona ${persona.typeCode}`)
  }
  if (tokens.length === 0) return null
  return locale === 'ko' ? `???: ${tokens.join(', ')}` : `Personalization: ${tokens.join(', ')}`
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
        repairMojibakeText(`${focusHint || '핵심 흐름'} � ${actionCue || '기본 운영 슬롯입니다.'}`),
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
        `${focusHint || 'Core flow'} � ${actionCue || 'Baseline operating slot.'}`
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

  const actionFramework = {
    do: unique(
      [
        (calendar?.recommendations || [])[0],
        singleSubjectView?.actionAxis.nowAction,
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
        (calendar?.warnings || [])[0],
        singleSubjectView?.riskAxis.warning,
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
          ? isKo
            ? `${formatSlotLabel(cautionSlot)}에는 결정보다 초안 작성/검증 작업으로 대체`
            : `At ${formatSlotLabel(cautionSlot)}, switch from decision to draft/validation work`
          : null,
        personDomainState?.holdMove,
        appliedProfileLead,
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
      const singleSubjectSummary = cleanGuidanceText(
        [
          getCanonicalSingleSubjectView(calendar)?.directAnswer,
          getCanonicalSingleSubjectView(calendar)?.actionAxis.nowAction,
          getCanonicalSingleSubjectView(calendar)?.timingState.whyNow,
        ]
          .filter(Boolean)
          .join(' � '),
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
