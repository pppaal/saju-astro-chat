import type { CounselorEvidencePacketLike } from '@/lib/destiny-matrix/counselorEvidenceTypes'

export type InterpretedAnswerFrame =
  | 'relationship_repair'
  | 'career_decision'
  | 'wealth_planning'
  | 'health_recovery'
  | 'timing_window'
  | 'identity_reflection'
  | 'open_counseling'

export type InterpretedAnswerDomain =
  | 'personality'
  | 'career'
  | 'relationship'
  | 'wealth'
  | 'health'
  | 'spirituality'
  | 'timing'
  | 'move'

export type InterpretedAnswerContract = {
  questionFrame: InterpretedAnswerFrame
  primaryDomain: InterpretedAnswerDomain
  directAnswer: string
  why: string[]
  timing: {
    bestWindow?: string
    now?: string
    next?: string
    later?: string
  }
  conditions: {
    entry: string[]
    abort: string[]
  }
  branches: Array<{
    label: string
    summary: string
    nextMove: string
  }>
  uncertainty: string[]
  nextMove: string
}

function uniqueLines(items: Array<string | undefined | null>, max = 3): string[] {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const item of items) {
    const value = String(item || '').trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    lines.push(value)
    if (lines.length >= max) break
  }
  return lines
}

function resolveAppliedSummary(
  packet: CounselorEvidencePacketLike | null | undefined,
  domain: InterpretedAnswerDomain
): string | undefined {
  const applied = packet?.personModel?.appliedProfile
  switch (domain) {
    case 'career':
      return applied?.workStyleProfile?.summary
    case 'relationship':
      return applied?.relationshipStyleProfile?.summary
    case 'wealth':
      return applied?.moneyStyleProfile?.summary
    case 'health':
      return applied?.lifeRhythmProfile?.summary || applied?.foodProfile?.summary
    case 'move':
      return applied?.environmentProfile?.summary
    default:
      return undefined
  }
}

function resolveUncertainty(
  packet: CounselorEvidencePacketLike | null | undefined,
  domain: InterpretedAnswerDomain
): string[] {
  const envelope = packet?.personModel?.uncertaintyEnvelope
  return uniqueLines(
    [
      ...(envelope?.conditionalAreas || []),
      ...(envelope?.unresolvedAreas || []),
      domain === 'career' ? packet?.topTimingWindow?.timingConflictNarrative : undefined,
    ],
    3
  )
}

function resolveDomainEvent(
  packet: CounselorEvidencePacketLike | null | undefined,
  domain: InterpretedAnswerDomain
) {
  return (packet?.personModel?.eventOutlook || []).find(
    (item: NonNullable<CounselorEvidencePacketLike['personModel']>['eventOutlook'][number]) =>
      item?.domain === domain
  )
}

function resolveDomainState(
  packet: CounselorEvidencePacketLike | null | undefined,
  domain: InterpretedAnswerDomain
) {
  return (packet?.personModel?.domainStateGraph || []).find(
    (item: NonNullable<CounselorEvidencePacketLike['personModel']>['domainStateGraph'][number]) =>
      item?.domain === domain
  )
}

function resolveDomainSpecificWhy(
  packet: CounselorEvidencePacketLike | null | undefined,
  domain: InterpretedAnswerDomain
): string[] {
  const personModel = packet?.personModel
  const applied = personModel?.appliedProfile

  switch (domain) {
    case 'career':
      return uniqueLines(
        [
          ...(personModel?.careerProfile?.executionStyle || []),
          ...(applied?.workStyleProfile?.bestConditions || []),
          ...(personModel?.careerProfile?.suitableLanes || []),
        ],
        3
      )
    case 'relationship':
      return uniqueLines(
        [
          ...(personModel?.relationshipProfile?.partnerArchetypes || []),
          ...(applied?.relationshipStyleProfile?.stabilizers || []),
          ...(personModel?.relationshipProfile?.inflowPaths || []),
        ],
        3
      )
    case 'wealth':
      return uniqueLines(
        [
          ...(applied?.moneyStyleProfile?.earningPattern || []),
          ...(applied?.moneyStyleProfile?.savingPattern || []),
          ...(applied?.moneyStyleProfile?.controlRules || []),
        ],
        3
      )
    case 'health':
      return uniqueLines(
        [
          ...(applied?.lifeRhythmProfile?.recoveryWindows || []),
          ...(applied?.lifeRhythmProfile?.regulationMoves || []),
          ...(applied?.foodProfile?.rhythmGuidance || []),
        ],
        3
      )
    case 'move':
      return uniqueLines(
        [
          ...(applied?.environmentProfile?.preferredSettings || []),
          ...(applied?.environmentProfile?.resetActions || []),
          personModel?.relationshipProfile?.summary,
        ],
        3
      )
    default:
      return []
  }
}

function resolveDomainSpecificEntry(
  packet: CounselorEvidencePacketLike | null | undefined,
  domain: InterpretedAnswerDomain
): string[] {
  const personModel = packet?.personModel
  const applied = personModel?.appliedProfile

  switch (domain) {
    case 'career':
      return uniqueLines(
        [
          ...(personModel?.careerProfile?.hiringTriggers || []),
          ...(applied?.workStyleProfile?.bestConditions || []),
        ],
        3
      )
    case 'relationship':
      return uniqueLines(
        [
          ...(personModel?.relationshipProfile?.commitmentConditions || []),
          ...(applied?.relationshipStyleProfile?.stabilizers || []),
        ],
        3
      )
    case 'wealth':
      return uniqueLines(
        [
          ...(applied?.moneyStyleProfile?.controlRules || []),
          ...(applied?.moneyStyleProfile?.savingPattern || []),
        ],
        3
      )
    case 'health':
      return uniqueLines(
        [
          ...(applied?.lifeRhythmProfile?.recoveryWindows || []),
          ...(applied?.foodProfile?.rhythmGuidance || []),
        ],
        3
      )
    case 'move':
      return uniqueLines(
        [
          ...(applied?.environmentProfile?.preferredSettings || []),
          ...(applied?.environmentProfile?.resetActions || []),
        ],
        3
      )
    default:
      return []
  }
}

function resolveDomainSpecificAbort(
  packet: CounselorEvidencePacketLike | null | undefined,
  domain: InterpretedAnswerDomain
): string[] {
  const personModel = packet?.personModel
  const applied = personModel?.appliedProfile

  switch (domain) {
    case 'career':
      return uniqueLines(
        [
          ...(personModel?.careerProfile?.blockers || []),
          ...(applied?.workStyleProfile?.fatigueTriggers || []),
        ],
        3
      )
    case 'relationship':
      return uniqueLines(
        [
          ...(personModel?.relationshipProfile?.breakPatterns || []),
          ...(applied?.relationshipStyleProfile?.ruptureTriggers || []),
        ],
        3
      )
    case 'wealth':
      return uniqueLines(
        [
          ...(applied?.moneyStyleProfile?.leakageRisks || []),
          ...(personModel?.uncertaintyEnvelope.conditionalAreas || []),
        ],
        3
      )
    case 'health':
      return uniqueLines(
        [
          ...(applied?.lifeRhythmProfile?.stressBehaviors || []),
          ...(applied?.foodProfile?.cautionFoods || []),
        ],
        3
      )
    case 'move':
      return uniqueLines(
        [
          ...(applied?.environmentProfile?.drainSignals || []),
          ...(personModel?.uncertaintyEnvelope.conditionalAreas || []),
        ],
        3
      )
    default:
      return []
  }
}

function resolveDomainSpecificNextMove(
  packet: CounselorEvidencePacketLike | null | undefined,
  domain: InterpretedAnswerDomain
): string | undefined {
  const personModel = packet?.personModel
  const applied = personModel?.appliedProfile
  const domainState = resolveDomainState(packet, domain)
  const event = resolveDomainEvent(packet, domain)

  switch (domain) {
    case 'career':
      return (
        event?.nextMove ||
        domainState?.firstMove ||
        applied?.workStyleProfile?.leverageMoves?.[0] ||
        personModel?.careerProfile?.hiringTriggers?.[0]
      )
    case 'relationship':
      return (
        event?.nextMove ||
        domainState?.firstMove ||
        applied?.relationshipStyleProfile?.repairMoves?.[0] ||
        personModel?.relationshipProfile?.commitmentConditions?.[0]
      )
    case 'wealth':
      return (
        event?.nextMove ||
        domainState?.firstMove ||
        applied?.moneyStyleProfile?.controlRules?.[0] ||
        applied?.moneyStyleProfile?.savingPattern?.[0]
      )
    case 'health':
      return (
        event?.nextMove ||
        domainState?.firstMove ||
        applied?.lifeRhythmProfile?.regulationMoves?.[0] ||
        applied?.foodProfile?.rhythmGuidance?.[0]
      )
    case 'move':
      return (
        domainState?.firstMove ||
        applied?.environmentProfile?.resetActions?.[0] ||
        applied?.environmentProfile?.preferredSettings?.[0]
      )
    default:
      return undefined
  }
}

export function buildInterpretedAnswerContract(input: {
  packet: CounselorEvidencePacketLike | null | undefined
  frame: InterpretedAnswerFrame
  primaryDomain: InterpretedAnswerDomain
}): InterpretedAnswerContract | null {
  const { packet, frame, primaryDomain } = input
  const singleSubject = packet?.singleSubjectView
  if (!packet || !singleSubject) return null

  const event = resolveDomainEvent(packet, primaryDomain)
  const domainState = resolveDomainState(packet, primaryDomain)
  const timingWindows = singleSubject.timingState?.windows || []
  const nextWindow =
    timingWindows.find((item) => item?.timescale === '1-3m') ||
    timingWindows.find((item) => item?.timescale === '3-6m')
  const laterWindow =
    timingWindows.find((item) => item?.timescale === '6-12m') ||
    timingWindows.find((item) => item?.timescale === '3-6m')

  const why = uniqueLines(
    [
      singleSubject.actionAxis?.whyThisFirst,
      domainState?.thesis,
      event?.summary,
      ...resolveDomainSpecificWhy(packet, primaryDomain),
      resolveAppliedSummary(packet, primaryDomain),
      packet?.topTimingWindow?.timingConflictNarrative,
    ],
    4
  )

  const entry = uniqueLines(
    [
      ...(event?.entryConditions || []),
      ...(singleSubject.entryConditions || []),
      ...(domainState?.timescales?.[0]?.entryConditions || []),
      ...resolveDomainSpecificEntry(packet, primaryDomain),
    ],
    3
  )
  const abort = uniqueLines(
    [
      ...(event?.abortConditions || []),
      ...(singleSubject.abortConditions || []),
      ...(domainState?.timescales?.[0]?.abortConditions || []),
      ...resolveDomainSpecificAbort(packet, primaryDomain),
      ...(singleSubject.riskAxis?.hardStops || []),
    ],
    3
  )
  const branches = (singleSubject.branches || []).slice(0, 3).map((branch) => ({
    label: branch.label,
    summary: branch.summary,
    nextMove: branch.nextMove,
  }))

  return {
    questionFrame: frame,
    primaryDomain,
    directAnswer: singleSubject.directAnswer,
    why,
    timing: {
      bestWindow: singleSubject.timingState?.bestWindow,
      now: singleSubject.timingState?.whyNow,
      next: nextWindow?.summary,
      later: laterWindow?.summary,
    },
    conditions: {
      entry,
      abort,
    },
    branches,
    uncertainty: resolveUncertainty(packet, primaryDomain),
    nextMove:
      resolveDomainSpecificNextMove(packet, primaryDomain) ||
      domainState?.firstMove ||
      singleSubject.nextMove,
  }
}
