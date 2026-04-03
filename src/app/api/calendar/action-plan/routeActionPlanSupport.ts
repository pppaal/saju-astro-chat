import { repairMojibakeText } from '@/lib/text/mojibake'
import { calculateDailyPillar, generateHourlyAdvice } from '@/lib/prediction/ultra-precision-daily'
import { STEM_ELEMENTS } from '@/lib/destiny-map/config/specialDays.data'
import { getHourlyRecommendation } from '@/lib/destiny-map/calendar/specialDays-analysis'
import {
  formatDecisionActionLabels,
  formatPolicyCheckLabels,
} from '@/lib/destiny-matrix/core/actionCopy'
import { describeTimingWindowBrief } from '@/lib/destiny-matrix/interpretation/humanSemantics'
import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'

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

export {
  clampPercent,
  cleanGuidanceText,
  extractHoursFromText,
  pickCategoryByHour,
  trimList,
} from './routeActionPlanCommon'

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
  canonicalCore?: Partial<CalendarCoreAdapterResult>
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
            ? 'ê²°ë¡ ì„ ë¯¸ë£¨ê³  ì²´í¬ë¦¬ìŠ¤íŠ¸ 3ê°œë¶€í„° ê²€ì¦í•˜ì„¸ìš”'
            : '1ì°¨ ê²°ë¡ ì„ ë¹ ë¥´ê²Œ ë‚´ê³  í›„ì† ë³´ì™„ìœ¼ë¡œ ë§ˆë¬´ë¦¬í•˜ì„¸ìš”'
          : tone === 'caution'
            ? 'Delay final decision and validate 3 checklist items first'
            : 'Lock a first decision quickly, then close with follow-up refinement'
      )
    } else if (dominance <= 35) {
      hints.push(
        locale === 'ko'
          ? 'ì˜ì‚¬ê²°ì • ì „ì— ê¸°ì¤€ 2~3ê°œë¥¼ ë¨¼ì € ê³ ì •í•˜ì„¸ìš”'
          : 'Fix 2-3 decision criteria before taking action'
      )
    }
  }

  if (typeof affiliation === 'number') {
    if (affiliation >= 70) {
      hints.push(
        locale === 'ko'
          ? 'í•µì‹¬ ê´€ê³„ìž 1ëª…ì—ê²Œ ë¨¼ì € ê³µìœ í•´ ì˜¤í•´ë¥¼ ì¤„ì´ì„¸ìš”'
          : 'Pre-brief one key stakeholder to reduce misunderstanding'
      )
    } else if (affiliation <= 30) {
      hints.push(
        locale === 'ko'
          ? 'ì•Œë¦¼ì„ ë„ê³  40ë¶„ ë‹¨ë… ì§‘ì¤‘ ë¸”ë¡ì„ í™•ë³´í•˜ì„¸ìš”'
          : 'Silence notifications and secure a 40-minute solo focus block'
      )
    }
  }

  const decisionPole = persona?.axes?.decision?.pole
  if (decisionPole === 'logic') {
    hints.push(
      locale === 'ko'
        ? 'íŒë‹¨ì€ ê°ê°ë³´ë‹¤ ìˆ˜ì¹˜/ê·¼ê±° 2ê°œë¥¼ ê¸°ì¤€ìœ¼ë¡œ ë‘ì„¸ìš”'
        : 'Anchor decisions on two concrete metrics over intuition'
    )
  } else if (decisionPole === 'empathic') {
    hints.push(
      locale === 'ko'
        ? 'ê²°ì • ì „ì— ìƒëŒ€ ì˜í–¥ 1ê°€ì§€ë¥¼ ë¨¼ì € í™•ì¸í•˜ì„¸ìš”'
        : 'Before deciding, check one human-impact factor first'
    )
  }

  const rhythmPole = persona?.axes?.rhythm?.pole
  if (rhythmPole === 'flow') {
    hints.push(
      locale === 'ko'
        ? 'ì§§ì€ ìŠ¤í”„ë¦°íŠ¸ 2íšŒë¡œ ì¶”ì§„ë ¥ì„ ìœ ì§€í•˜ì„¸ìš”'
        : 'Use two short sprints to maintain momentum'
    )
  } else if (rhythmPole === 'anchor') {
    hints.push(
      locale === 'ko'
        ? 'ì •í•´ì§„ ìˆœì„œ 3ë‹¨ê³„ë¡œ ì§„í–‰í•˜ë©´ í”ë“¤ë¦¼ì´ ì¤„ì–´ë“­ë‹ˆë‹¤'
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
      locale === 'ko' ? `íŽ˜ë¥´ì†Œë‚˜ ${persona.personaName}` : `Persona ${persona.personaName}`
    )
  } else if (persona?.typeCode) {
    tokens.push(
      locale === 'ko' ? `íŽ˜ë¥´ì†Œë‚˜ ${persona.typeCode}` : `Persona ${persona.typeCode}`
    )
  }

  if (tokens.length === 0) return null
  return locale === 'ko'
    ? `ê°œì¸í™”: ${tokens.join(', ')}`
    : `Personalization: ${tokens.join(', ')}`
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

export function getCanonicalSingleSubjectView(calendar?: ActionPlanCalendarContext) {
  return calendar?.canonicalCore?.singleSubjectView
}

export function getCanonicalPersonModel(calendar?: ActionPlanCalendarContext) {
  return calendar?.canonicalCore?.personModel
}

function normalizeCalendarCategoryToCoreDomain(category?: string): string {
  const normalized = normalizeActionCategory(category)
  if (normalized === 'love') return 'relationship'
  if (normalized === 'money') return 'wealth'
  if (normalized === 'travel') return 'move'
  return normalized
}

function pickPrimaryPersonDomain(calendar?: ActionPlanCalendarContext, category?: string) {
  const canonical = getCanonicalCore(calendar)
  return (
    normalizeCalendarCategoryToCoreDomain(category) ||
    canonical?.actionFocusDomain ||
    canonical?.focusDomain ||
    ''
  )
}

function getDomainStateLead(calendar?: ActionPlanCalendarContext, category?: string) {
  const personModel = getCanonicalPersonModel(calendar)
  const domain = pickPrimaryPersonDomain(calendar, category)
  return personModel?.domainStateGraph?.find((item) => item.domain === domain)
}

function getEventOutlookLead(calendar?: ActionPlanCalendarContext, category?: string) {
  const personModel = getCanonicalPersonModel(calendar)
  const domain = pickPrimaryPersonDomain(calendar, category)
  return (
    personModel?.eventOutlook?.find((item) => item.domain === domain) ||
    personModel?.eventOutlook?.[0]
  )
}

function getAppliedProfileLead(calendar?: ActionPlanCalendarContext, category?: string) {
  const personModel = getCanonicalPersonModel(calendar)
  const domain = pickPrimaryPersonDomain(calendar, category)
  const profile = personModel?.appliedProfile
  if (!profile) return ''

  if (domain === 'career') {
    return profile.workStyleProfile.summary || profile.workStyleProfile.leverageMoves?.[0] || ''
  }
  if (domain === 'relationship') {
    return (
      profile.relationshipStyleProfile.summary ||
      profile.relationshipStyleProfile.repairMoves?.[0] ||
      ''
    )
  }
  if (domain === 'wealth') {
    return profile.moneyStyleProfile.summary || profile.moneyStyleProfile.controlRules?.[0] || ''
  }
  if (domain === 'health') {
    return profile.lifeRhythmProfile.summary || profile.lifeRhythmProfile.regulationMoves?.[0] || ''
  }
  return profile.environmentProfile.summary || profile.lifeRhythmProfile.summary || ''
}

function buildSingleSubjectBranchLead(
  calendar: ActionPlanCalendarContext | undefined,
  locale: 'ko' | 'en'
): string {
  const branch = getCanonicalSingleSubjectView(calendar)?.branches?.[0]
  if (!branch) return ''
  const label = cleanGuidanceText(branch.label || '', 48)
  const summary = cleanGuidanceText(branch.summary || '', 96)
  const nextMove = cleanGuidanceText(branch.nextMove || '', 96)
  if (locale === 'ko') {
    return cleanGuidanceText(
      [label, summary, nextMove ? `다음 행동: ${nextMove}` : ''].filter(Boolean).join(' · '),
      140
    )
  }
  return cleanGuidanceText(
    [label, summary, nextMove ? `Next move: ${nextMove}` : ''].filter(Boolean).join(' · '),
    140
  )
}

function buildSingleSubjectTimingLead(
  calendar: ActionPlanCalendarContext | undefined,
  locale: 'ko' | 'en'
): string {
  const timing = getCanonicalSingleSubjectView(calendar)?.timingState
  if (!timing?.bestWindow) return ''
  const whyLine =
    cleanGuidanceText(timing.whyNow || '', 84) || cleanGuidanceText(timing.whyNotYet || '', 84)
  if (locale === 'ko') {
    return cleanGuidanceText(
      [`강한 창: ${timing.bestWindow}`, whyLine].filter(Boolean).join(' · '),
      140
    )
  }
  return cleanGuidanceText(
    [`Best window: ${timing.bestWindow}`, whyLine].filter(Boolean).join(' · '),
    140
  )
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
  const singleSubjectTimingLead = buildSingleSubjectTimingLead(calendar, locale)
  const actionDomain = getCanonicalActionDomain(calendar)
  const timing =
    canonical?.topTimingWindow ||
    canonical?.domainTimingWindows?.find((item) => item.domain === actionDomain) ||
    canonical?.domainTimingWindows?.find((item) => item.domain === canonical?.focusDomain) ||
    canonical?.domainTimingWindows?.[0]
  if (!timing?.window) return singleSubjectTimingLead
  const canonicalBrief = describeTimingWindowBrief({
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
  return cleanGuidanceText(
    [singleSubjectTimingLead, canonicalBrief].filter(Boolean).join(' · '),
    180
  )
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
    /recover|rest|reset|sleep|íšŒë³µ|íœ´ì‹|ì •ë¦¬/.test(joinedText)
  ) {
    patterns.add('recovery_need_up')
  }
  if (/speed|momentum|push|attack|fast|ì†ë„|ì¶”ì§„|ê°€ì†/.test(joinedText)) {
    patterns.add('speed_up_validation_down')
  }
  if (/risk|friction|delay|counter|caution|ì£¼ì˜|ì¶©ëŒ|ë§ˆì°°|ê²€ì¦/.test(joinedText)) {
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
    containsAny(note, ['money', 'budget', 'spend', 'ì§€ì¶œ', 'ì˜ˆì‚°'])
  ) {
    types.add('money')
  }
  if (
    normalizedCategory === 'love' ||
    containsAny(note, ['relationship', 'message', 'talk', 'ê´€ê³„', 'ëŒ€í™”', 'ì†Œí†µ'])
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
      ? `${patternHint} íë¦„ì´ ê°•í•©ë‹ˆë‹¤. ${matrixDomain} ì˜ì—­ì€ ê·¼ê±°ë¥¼ í™•ì¸í•œ ë’¤ ì‹¤í–‰í•˜ì„¸ìš”.`
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
        ? 'ìµœì¢… í™•ì • ê¸ˆì§€: ë°˜ëŒ€ ê·¼ê±° 1ê°œì™€ ì˜í–¥ ë²”ìœ„ 1ì¤„ í™•ì¸ í›„ í™•ì •'
        : 'No final decision until one counter-evidence and one impact line are verified.'
      : slotTypes.includes('money')
        ? locale === 'ko'
          ? 'ì§‘í–‰ ì „ ì´ì•¡Â·í•œë„Â·ìµœì•…ì†ì‹¤ 3ê°œ ìˆ«ìžë¥¼ ë¨¼ì € í™•ì¸'
          : 'Check total, limit, and worst-case loss before spending or investing.'
        : slotTypes.includes('relationship')
          ? locale === 'ko'
            ? 'ì „ì†¡ ì „ ì˜ë„Â·ìš”ì²­Â·ê¸°í•œ 3ìš”ì†Œë¥¼ í•œ ì¤„ë¡œ ë¨¼ì € ì •ë¦¬'
            : 'Before sending, make intent, request, and deadline clear in one line.'
          : slotTypes.includes('recovery')
            ? locale === 'ko'
              ? 'ìƒˆ ì•½ì† ì¶”ê°€ë³´ë‹¤ íšŒë³µê³¼ ì •ë¦¬ë¥¼ ìš°ì„ '
              : 'Prioritize recovery and reset before adding new commitments.'
            : slotTypes.includes('decision')
              ? locale === 'ko'
                ? 'ê²°ë¡  ì „ì— íŒë‹¨ ê¸°ì¤€ 2ê°œë¥¼ ë¨¼ì € ì ê¸°'
                : 'Write two decision criteria before committing.'
              : locale === 'ko'
                ? 'ì‹œìž‘ ì „ ì„±ê³µ ì¡°ê±´ 1ì¤„ê³¼ ì¤‘ë‹¨ ê¸°ì¤€ 1ì¤„ì„ ê¸°ë¡'
                : 'Write one success condition and one stop condition before starting.'

  if (!matrixGuardrail) {
    if (!riskAxisLabel) return slotSpecific
    return [
      slotSpecific,
      locale === 'ko'
        ? `${riskAxisLabel} ì¶• ë¦¬ìŠ¤í¬ë¥¼ ë¨¼ì € ê´€ë¦¬`
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
        ? `${riskAxisLabel} ì¶• ë¦¬ìŠ¤í¬ë¥¼ ë¨¼ì € ê´€ë¦¬`
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
        ? 'ìˆ«ìž ê²€ì¦ë§Œ í•˜ê³  ì§‘í–‰ì€ ë¯¸ë£¨ëŠ” íŽ¸ì´ ë‚«ìŠµë‹ˆë‹¤.'
        : 'Validate the numbers now and delay execution.'
    }
    if (primary === 'relationship') {
      return isKo
        ? 'í•´ì„ë³´ë‹¤ í™•ì¸ ì§ˆë¬¸ 1ê°œê°€ ìš°ì„ ìž…ë‹ˆë‹¤.'
        : 'One clarifying question beats interpretation right now.'
    }
    if (primary === 'decision') {
      return isKo
        ? 'ê²°ë¡ ë³´ë‹¤ ê²€ì¦ê³¼ ìž¬ì •ë ¬ì— ì“°ëŠ” íŽ¸ì´ ë‚«ìŠµë‹ˆë‹¤.'
        : 'Use this slot for validation and re-alignment, not commitment.'
    }
    return isKo
      ? 'í™•ì •ë³´ë‹¤ ë¦¬ìŠ¤í¬ ì œê±°ì— ì“°ëŠ” íŽ¸ì´ ë‚«ìŠµë‹ˆë‹¤.'
      : 'Use this slot to remove risk, not to finalize.'
  }

  switch (primary) {
    case 'money':
      return isKo
        ? 'ì˜ˆì‚°Â·ì¡°ê±´ì„ ë§žì¶˜ ë’¤ ì‹¤í–‰í•˜ê¸° ì¢‹ìŠµë‹ˆë‹¤.'
        : 'Good for execution after budget and terms are locked.'
    case 'relationship':
      return isKo
        ? 'í•µì‹¬ ë©”ì‹œì§€ë¥¼ ì§§ê³  ëª…í™•í•˜ê²Œ ì „í•˜ê¸° ì¢‹ìŠµë‹ˆë‹¤.'
        : 'Good for a short, clear message or check-in.'
    case 'recovery':
      return isKo
        ? 'íšŒë³µê³¼ ì •ë¦¬ ë£¨í‹´ì„ ë„£ê¸° ì¢‹ìŠµë‹ˆë‹¤.'
        : 'Good for recovery, reset, and cleanup.'
    case 'decision':
      return isKo
        ? 'íŒë‹¨ ê¸°ì¤€ì„ ì„¸ìš°ê³  í•œ ê±´ ê²°ì •í•˜ê¸° ì¢‹ìŠµë‹ˆë‹¤.'
        : 'Good for setting criteria and making one decision.'
    case 'communication':
      return isKo
        ? 'ì„¤ëª…, ì¡°ìœ¨, í”¼ë“œë°± ì „ë‹¬ì— ìœ ë¦¬í•©ë‹ˆë‹¤.'
        : 'Good for explanation, alignment, and feedback.'
    default:
      return isKo
        ? 'í•µì‹¬ í•œ ê±´ì„ ì§‘ì¤‘í•´ì„œ ë°€ê¸° ì¢‹ìŠµë‹ˆë‹¤.'
        : 'Good for pushing one focused task.'
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
      phase ? `íë¦„ ${phase}` : undefined,
      timingBrief || undefined,
      actionCue,
      claim || undefined,
      anchor ? `ê·¼ê±°: ${anchor}` : scenario ? `ì‹œë‚˜ë¦¬ì˜¤: ${scenario}` : undefined,
    ].filter(Boolean)
    const composed = cleanGuidanceText(
      parts.join(' Â· ') || fallbackNote || 'ê¸°ë³¸ ìš´ì˜ ìŠ¬ë¡¯ìž…ë‹ˆë‹¤.',
      180
    )
    if (composed) return composed
    return (
      cleanGuidanceText(repairMojibakeText(fallbackNote || ''), 180) ||
      cleanGuidanceText(
        repairMojibakeText(
          `${focusHint || 'í•µì‹¬ íë¦„'} · ${actionCue || 'ê¸°ë³¸ ìš´ì˜ ìŠ¬ë¡¯ìž…ë‹ˆë‹¤.'}`
        ),
        180
      ) ||
      'ê¸°ë³¸ ìš´ì˜ ìŠ¬ë¡¯ìž…ë‹ˆë‹¤.'
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
    parts.join(' Â· ') || fallbackNote || 'Baseline operating slot.',
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
  if (bestHit && warningHit) reasons.push(isKo ? 'ê·¼ê±° ì¶©ëŒ' : 'Evidence conflict')
  if (why.anchorIds.length < 1 || (!canonical && packetAnchorCount < 1))
    reasons.push(isKo ? 'anchor ë¶€ì¡±' : 'Anchor shortage')
  if (why.signalIds.length < 3 || (!canonical && packetSignalCount < 3))
    reasons.push(isKo ? 'signal ë°€ë„ ë‚®ìŒ' : 'Low signal density')
  if (slot.tone === 'caution') reasons.push(isKo ? 'ë¦¬ìŠ¤í¬ êµ¬ê°„' : 'Risk window')
  if (base < 55) reasons.push(isKo ? 'ê¸°ë³¸ ì‹ ë¢°ë„ ë‚®ìŒ' : 'Low baseline confidence')
  if (reasons.length === 0) reasons.push(isKo ? 'ì‹ í˜¸ ì •ë ¬ ì–‘í˜¸' : 'Signals aligned')

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
        `ì˜¤ëŠ˜ì€ ì¶”ì§„ì€ ê°•í•œë° ê²€ì¦ì´ ì•½í•´ì§€ê¸° ì‰½ìŠµë‹ˆë‹¤. ${primaryLine || 'í° ê²°ì •ì€ ì´ˆì•ˆ-ê²€ì¦-í™•ì • 3ë‹¨ê³„ë¡œ ë‚˜ëˆ„ì„¸ìš”.'}`,
        140
      )
    }
    if (bestCount >= cautionCount + 2 && avgConfidence < 72) {
      return 'ì˜¤ëŠ˜ì€ ì†ë„ëŠ” ë¹ ë¥´ì§€ë§Œ ê²€ì¦ ëˆ„ë½ ìœ„í—˜ì´ í½ë‹ˆë‹¤. ê²°ì • 1ê±´ë‹¹ ê²€ì¦ 1íšŒë¥¼ ê°•ì œí•˜ì„¸ìš”.'
    }
    if (defense > attack + 10 || cautionCount > bestCount) {
      return 'ì˜¤ëŠ˜ì€ ì™¸ë¶€ ë³€ìˆ˜ ëŒ€ì‘ì¼ìž…ë‹ˆë‹¤. ì‹ ê·œ í™•ì •ë³´ë‹¤ ë¦¬ìŠ¤í¬ ì œê±°ì™€ ìž¬ì •ë ¬ì„ ìš°ì„ í•˜ì„¸ìš”.'
    }
    return cleanGuidanceText(
      `ì˜¤ëŠ˜ì€ ì„±ê³¼ êµ¬ê°„ê³¼ ì¡°ì • êµ¬ê°„ì´ ì„žì—¬ ìžˆìŠµë‹ˆë‹¤. ${primaryLine || 'í° ì¼ì€ ì¢‹ì€ ìŠ¬ë¡¯ì—, ì¡°ì •ì€ ì£¼ì˜ ìŠ¬ë¡¯ì— ë°°ì¹˜í•˜ì„¸ìš”.'}`,
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
          ? `${canonical.riskAxisLabel} ì¶• ë¦¬ìŠ¤í¬ë¥¼ ë¨¼ì € ê´€ë¦¬`
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
        ? `IF í•µì‹¬ ì‹ í˜¸ ì²´ê° THEN ${topClaim} ê¸°ì¤€ìœ¼ë¡œ ì´ˆì•ˆâ†’ê²€ì¦â†’í™•ì • ìˆœì„œë¥¼ ìœ ì§€`
        : `If the core signal spikes, keep draft -> validate -> commit around: ${topClaim}`
      : null,
    singleSubjectView?.nextMove
      ? isKo
        ? `IF ì§€ê¸ˆ ì£¼ì¶•ì„ ë”°ë¥¸ë‹¤ë©´ THEN ${cleanGuidanceText(singleSubjectView.nextMove, 110)}`
        : `If you follow the current axis, do this next: ${cleanGuidanceText(singleSubjectView.nextMove, 110)}`
      : null,
    bestSlot
      ? isKo
        ? `IF ${formatSlotLabel(bestSlot)} ì‹œìž‘ THEN 25ë¶„ ë‚´ ì´ˆì•ˆ/ì‚°ì¶œë¬¼ 1ê°œ ì €ìž¥`
        : `If you start at ${formatSlotLabel(bestSlot)}, lock the first output within 25 minutes.`
      : null,
    cautionSlot
      ? isKo
        ? `IF ${formatSlotLabel(cautionSlot)} ê²°ì • ìš”ì²­ THEN 10ë¶„ ìœ ì˜ˆ + ì²´í¬ë¦¬ìŠ¤íŠ¸(ëª©í‘œ/ë¹„ìš©/ë¦¬ìŠ¤í¬) 3í•­ëª© í™•ì¸`
        : `If a decision is needed at ${formatSlotLabel(cautionSlot)}, delay 10 minutes and validate 3 checklist points.`
      : null,
    topCategory === 'wealth'
      ? isKo
        ? 'IF ì§€ì¶œ/íˆ¬ìž ì§‘í–‰ THEN ì´ì•¡Â·í•œë„Â·ìµœì•…ì†ì‹¤ ìˆ«ìž 3ê°œ í™•ì¸ í›„ ì§„í–‰'
        : 'If spending/investing, confirm total-limit-worst loss before execution.'
      : topCategory === 'love'
        ? isKo
          ? 'IF ë¯¼ê° ëŒ€í™” ì‹œìž‘ THEN ì‚¬ì‹¤ 1ì¤„ ë¨¼ì €, ê°ì • í‘œí˜„ì€ ê·¸ë‹¤ìŒ'
          : 'If starting a sensitive talk, state one fact first, then emotion.'
        : isKo
          ? 'IF ìž‘ì—… ì°©ìˆ˜ THEN ì¢…ë£Œ ì¡°ê±´ 1ì¤„ ê¸°ë¡ í›„ ì‹œìž‘'
          : 'If starting work, write one done-condition before execution.',
    eventOutlook?.nextMove
      ? isKo
        ? `IF ${eventOutlook.label} ì¡°ê±´ì´ ë§žìœ¼ë©´ THEN ${cleanGuidanceText(eventOutlook.nextMove, 100)}`
        : `If ${eventOutlook.label} conditions line up, do this next: ${cleanGuidanceText(eventOutlook.nextMove, 100)}`
      : null,
    branchLead
      ? isKo
        ? `IF ë¶„ê¸° ì¡°ê±´ì´ ê°ˆë¦¬ë©´ THEN ${branchLead}`
        : `If branch conditions diverge, follow this first: ${branchLead}`
      : null,
  ])

  if (softCheckCopy[0]) {
    ifThenRules.unshift(
      isKo
        ? `IF ì‹¤í–‰ ì „ í™•ì¸ THEN ${softCheckCopy[0]}`
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
          ? `í˜„ìž¬ íë¦„(${phaseLabel})ì´ í”ë“¤ë¦¬ë©´ ì¦‰ì‹œ ì†ë„ë¥¼ ë‚®ì¶”ê³  ë‹¤ì‹œ ë§žì¶”ì„¸ìš”`
          : `If the current flow (${phaseLabel}) feels unstable, slow down and realign first`
        : null,
      isKo
        ? 'í”¼ë¡œ 7/10 ì´ìƒ: ì‹ ê·œ ê²°ì • ì¤‘ë‹¨, 20ë¶„ íšŒë³µ í›„ ìž¬í‰ê°€'
        : 'If fatigue >= 7/10: pause new decisions and run the validation checklist first',
      isKo
        ? '10ë¶„ ë‚´ ìš”ì²­ 3ê±´ ì´ìƒ ìœ ìž…: ì¦‰ë‹µ ê¸ˆì§€, ìš°ì„ ìˆœìœ„ ìž¬ì •ë ¬'
        : 'If 3+ incoming requests cluster: re-prioritize before replying fast',
      isKo
        ? 'ì˜ˆìƒ ì™¸ ì§€ì¶œ ìœ í˜¹ ë°œìƒ: 24ì‹œê°„ ë³´ë¥˜ í›„ ìž¬ìŠ¹ì¸'
        : 'If spending/investment urge appears: validate amount-limit-alternative before action',
      isKo
        ? 'ìš”êµ¬ì‚¬í•­ì´ 1ì‹œê°„ ë‚´ 2íšŒ ì´ìƒ ë³€ê²½: í™•ì • ì „ ë¬¸ì„œí™”'
        : 'If requirements change twice within an hour: document before commitment',
      typeof icp?.dominanceScore === 'number' && icp.dominanceScore >= 70
        ? isKo
          ? 'ì†ë„ ìš•êµ¬ ê¸‰ìƒìŠ¹: ë°˜ëŒ€ ê·¼ê±° 1ê°œ ìˆ˜ì§‘ ì „ ê²°ë¡  ê¸ˆì§€'
          : 'If drive spikes: force-collect one counter-evidence'
        : null,
      persona?.challenges?.[0]
        ? isKo
          ? `ë°˜ë³µ ì•½ì (${persona.challenges[0]}) ì‹ í˜¸ ê°ì§€: ê³ ë‚œë„ ìž‘ì—… ì¤‘ë‹¨ í›„ ì €ë¦¬ìŠ¤í¬ ëŒ€ì²´ì•ˆ ì‹¤í–‰`
          : `If recurring weakness (${persona.challenges[0]}) appears: switch to low-risk fallback immediately`
        : null,
      singleSubjectView?.abortConditions?.[0]
        ? isKo
          ? `ì¤‘ë‹¨ ì¡°ê±´: ${cleanGuidanceText(singleSubjectView.abortConditions[0], 96)}`
          : `Abort condition: ${cleanGuidanceText(singleSubjectView.abortConditions[0], 96)}`
        : null,
      eventOutlook?.abortConditions?.[0]
        ? isKo
          ? `ì´ë²¤íŠ¸ ì¤‘ë‹¨ ì‹ í˜¸: ${cleanGuidanceText(eventOutlook.abortConditions[0], 96)}`
          : `Event abort signal: ${cleanGuidanceText(eventOutlook.abortConditions[0], 96)}`
        : null,
    ],
    5
  )

  if (hardStopCopy[0]) {
    situationTriggers.unshift(
      isKo
        ? `ì¦‰ì‹œ ì¤‘ë‹¨ ì¡°ê±´: ${hardStopCopy[0]}`
        : `Immediate stop condition: ${hardStopCopy[0]}`
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
          ? `í•µì‹¬ ì•µì»¤ ì´íƒˆ: ${topAnchor}`
          : `Anchor drift detected: ${topAnchor}`
        : null,
      cautionSlots.length
        ? isKo
          ? `ì£¼ì˜ ì‹œê°„ëŒ€ ì§‘ì¤‘: ${cautionSlots.join(', ')}`
          : `Caution windows concentrated: ${cautionSlots.join(', ')}`
        : null,
      (calendar?.warnings || [])[0]
        ? isKo
          ? `ë°˜ë³µ ë¦¬ìŠ¤í¬: ${(calendar?.warnings || [])[0]}`
          : `Repeated risk: ${(calendar?.warnings || [])[0]}`
        : null,
      isKo
        ? 'ê·¼ê±° ì¶©ëŒ(ì¢‹ì€ ì‹œê°„+ì£¼ì˜ ì‹ í˜¸ ë™ì‹œ): ìµœì¢… í™•ì • ì§€ì—°'
        : 'If evidence conflict occurs (best-time + warning overlap), delay finalization',
      isKo
        ? 'ê·¼ê±° ì‹ í˜¸ê°€ ì•½í•œ ìŠ¬ë¡¯ì€ í™•ì •ë³´ë‹¤ ì´ˆì•ˆ/ê²€ì¦ ìž‘ì—…ìœ¼ë¡œ ì „í™˜'
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
        isKo
          ? `${topCategory} ì˜ì—­ í•µì‹¬ ì•¡ì…˜ 1ê±´ ì™„ë£Œ`
          : `Complete one key ${topCategory} action`,
        isKo ? 'ì‹œìž‘ ì „ ì™„ë£Œ ê¸°ì¤€ 1ì¤„ ìž‘ì„±' : 'Write one done-condition before start',
        isKo
          ? 'ìž‘ì—… ì¢…ë£Œ ì§í›„ ê²°ê³¼ ë¡œê·¸ 1ì¤„ ê¸°ë¡'
          : 'Log one result line immediately after completion',
      ],
      4
    ),
    dont: unique(
      [
        (calendar?.warnings || [])[0],
        singleSubjectView?.riskAxis.warning,
        personDomainState?.holdMove,
        isKo ? 'ê·¼ê±° ì—†ëŠ” ì¦‰í¥ ê²°ì • ê¸ˆì§€' : 'No impulsive decision without evidence',
        isKo ? 'ì£¼ì˜ ìŠ¬ë¡¯ì—ì„œ í™•ì • ê²°ë¡  ê¸ˆì§€' : 'No final decisions in caution slots',
        isKo
          ? 'ë©€í‹°íƒœìŠ¤í‚¹ 3ê°œ ì´ìƒ ë™ì‹œ ì§„í–‰ ê¸ˆì§€'
          : 'No 3+ parallel tasks at the same time',
      ],
      4
    ),
    alternative: unique(
      [
        cautionSlot
          ? isKo
            ? `${formatSlotLabel(cautionSlot)}ì—ëŠ” ê²°ì •ë³´ë‹¤ ì´ˆì•ˆ ìž‘ì„±/ê²€ì¦ ìž‘ì—…ìœ¼ë¡œ ëŒ€ì²´`
            : `At ${formatSlotLabel(cautionSlot)}, switch from decision to draft/validation work`
          : null,
        personDomainState?.holdMove,
        appliedProfileLead,
        bestSlot
          ? isKo
            ? `${formatSlotLabel(bestSlot)}ì—ëŠ” í•µì‹¬ 1ê±´ë§Œ ì™„ìˆ˜í•˜ê³  ë¡œê·¸ ê¸°ë¡`
            : `At ${formatSlotLabel(bestSlot)}, complete one key action and log it`
          : null,
        isPremiumUser
          ? isKo
            ? 'ë¦¬ìŠ¤í¬ ê°ì§€ ì‹œ 3ë‹¨ê³„ ë³µêµ¬(ì¤‘ë‹¨-ì •ë ¬-ìž¬ê°œ) ì ìš©'
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
        ? `í‰ê·  ìŠ¬ë¡¯ ì‹ ë¢°ë„ ${avgConfidence}% ì´ìƒ`
        : `Average slot confidence >= ${avgConfidence}%`,
      isKo
        ? `í•µì‹¬ ì•¡ì…˜ ì™„ë£Œ ${Math.max(1, Math.min(3, bestCount))}ê±´`
        : `Complete ${Math.max(1, Math.min(3, bestCount))} core actions`,
      isKo ? 'ì£¼ì˜ ìŠ¬ë¡¯ì—ì„œ í™•ì • ì˜ì‚¬ê²°ì • 0ê±´' : 'Zero final decisions in caution slots',
      isKo ? 'ì²´í¬ë¦¬ìŠ¤íŠ¸ ì‹¤í–‰ë¥  100%' : 'Checklist execution rate 100%',
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
            warningHint ? `ì£¼ì˜ í¬ì¸íŠ¸: ${warningHint}` : `ì£¼ì˜: ${avoid || 'ë¬´ë¦¬í•œ ê²°ì •'}`
          }`
        } else {
          detailLine = `${focusHint}. ${
            recHint ? `ì‹¤í–‰: ${recHint}` : `ì¶”ì²œ: ${best || 'í•µì‹¬ ì—…ë¬´'}`
          }`
        }
        if (personalHint) {
          detailLine = `${detailLine}. ê°œì¸í™”: ${personalHint}`
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
                  ? `ê°œì¸í™” ê·¼ê±°: ${personalHint}`
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
