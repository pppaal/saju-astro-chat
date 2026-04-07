import { describeTimingWindowBrief } from '@/lib/destiny-matrix/interpretation/humanSemantics'
import {
  cleanGuidanceText,
  normalizeActionCategory,
  type TimelineTone,
} from './routeActionPlanCommon'
import type {
  ActionPlanCalendarContext,
  MatrixEvidencePacket,
  SlotType,
} from './routeActionPlanSupport.types'
import { SLOT_TYPE_DOMAIN_HINTS } from './routeActionPlanSupport.types'

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

export function getDomainStateLead(calendar?: ActionPlanCalendarContext, category?: string) {
  const personModel = getCanonicalPersonModel(calendar)
  const domain = pickPrimaryPersonDomain(calendar, category)
  return personModel?.domainStateGraph?.find((item) => item.domain === domain)
}

export function getEventOutlookLead(calendar?: ActionPlanCalendarContext, category?: string) {
  const personModel = getCanonicalPersonModel(calendar)
  const domain = pickPrimaryPersonDomain(calendar, category)
  return (
    personModel?.eventOutlook?.find((item) => item.domain === domain) ||
    personModel?.eventOutlook?.[0]
  )
}

export function getAppliedProfileLead(calendar?: ActionPlanCalendarContext, category?: string) {
  const personModel = getCanonicalPersonModel(calendar)
  const domain = pickPrimaryPersonDomain(calendar, category)
  const profile = personModel?.appliedProfile
  if (!profile) return ''
  if (domain === 'career')
    return profile.workStyleProfile.summary || profile.workStyleProfile.leverageMoves?.[0] || ''
  if (domain === 'relationship')
    return (
      profile.relationshipStyleProfile.summary ||
      profile.relationshipStyleProfile.repairMoves?.[0] ||
      ''
    )
  if (domain === 'wealth')
    return profile.moneyStyleProfile.summary || profile.moneyStyleProfile.controlRules?.[0] || ''
  if (domain === 'health')
    return profile.lifeRhythmProfile.summary || profile.lifeRhythmProfile.regulationMoves?.[0] || ''
  return profile.environmentProfile.summary || profile.lifeRhythmProfile.summary || ''
}

export function buildSingleSubjectBranchLead(
  calendar: ActionPlanCalendarContext | undefined,
  locale: 'ko' | 'en'
): string {
  const branch = getCanonicalSingleSubjectView(calendar)?.branches?.[0]
  if (!branch) return ''
  const label = cleanGuidanceText(branch.label || '', 48)
  const summary = cleanGuidanceText(branch.summary || '', 96)
  const nextMove = cleanGuidanceText(branch.nextMove || '', 96)
  return cleanGuidanceText(
    [
      label,
      summary,
      nextMove ? (locale === 'ko' ? `다음 행동: ${nextMove}` : `Next move: ${nextMove}`) : '',
    ]
      .filter(Boolean)
      .join(' · '),
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
  return cleanGuidanceText(
    [
      locale === 'ko' ? `강한 창: ${timing.bestWindow}` : `Best window: ${timing.bestWindow}`,
      whyLine,
    ]
      .filter(Boolean)
      .join(' · '),
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
  slotTypes.forEach((slotType) =>
    SLOT_TYPE_DOMAIN_HINTS[slotType].forEach((domain) => hints.add(domain))
  )
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
  )
    patterns.add('recovery_need_up')
  if (/speed|momentum|push|attack|fast|속도|추진|가속/.test(joinedText))
    patterns.add('speed_up_validation_down')
  if (/risk|friction|delay|counter|caution|주의|충돌|마찰|검증/.test(joinedText))
    patterns.add('risk_exposure_up')
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
