import type { CounselorEvidencePacketLike } from '@/lib/destiny-matrix/counselorEvidenceTypes'

export type InterpretedAnswerFrame =
  | 'relationship_repair'
  | 'relationship_commitment'
  | 'career_decision'
  | 'wealth_planning'
  | 'health_recovery'
  | 'move_lease'
  | 'move_relocation'
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

export type InterpretedAnswerQualityResult = {
  pass: boolean
  warnings: string[]
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

function composeLine(items: Array<string | undefined | null>, max = 2): string | undefined {
  const lines = uniqueLines(items, max)
  return lines.length > 0 ? lines.join(' ') : undefined
}

function resolveEffectiveDomain(
  frame: InterpretedAnswerFrame,
  primaryDomain: InterpretedAnswerDomain
): InterpretedAnswerDomain {
  if (frame === 'move_lease' || frame === 'move_relocation') return 'move'
  if (frame === 'relationship_commitment') return 'relationship'
  return primaryDomain
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
  domain: InterpretedAnswerDomain,
  frame?: InterpretedAnswerFrame
): string[] {
  const personModel = packet?.personModel
  const applied = personModel?.appliedProfile
  const domainState = resolveDomainState(packet, domain)
  const event = resolveDomainEvent(packet, domain)

  switch (domain) {
    case 'career':
      return uniqueLines(
        [
          event?.summary,
          domainState?.thesis,
          ...(personModel?.careerProfile?.executionStyle || []),
          ...(applied?.workStyleProfile?.bestConditions || []),
          ...(personModel?.careerProfile?.suitableLanes || []),
          domainState?.nextShift,
        ],
        4
      )
    case 'relationship':
      return uniqueLines(
        [
          event?.summary,
          domainState?.thesis,
          ...(frame === 'relationship_commitment'
            ? personModel?.relationshipProfile?.commitmentConditions || []
            : []),
          ...(personModel?.relationshipProfile?.partnerArchetypes || []),
          ...(applied?.relationshipStyleProfile?.stabilizers || []),
          ...(personModel?.relationshipProfile?.inflowPaths || []),
          domainState?.nextShift,
        ],
        4
      )
    case 'wealth':
      return uniqueLines(
        [
          event?.summary,
          domainState?.thesis,
          ...(applied?.moneyStyleProfile?.earningPattern || []),
          ...(applied?.moneyStyleProfile?.savingPattern || []),
          ...(applied?.moneyStyleProfile?.controlRules || []),
          domainState?.nextShift,
        ],
        4
      )
    case 'health':
      return uniqueLines(
        [
          event?.summary,
          domainState?.thesis,
          ...(applied?.lifeRhythmProfile?.recoveryWindows || []),
          ...(applied?.lifeRhythmProfile?.regulationMoves || []),
          ...(applied?.foodProfile?.rhythmGuidance || []),
          domainState?.nextShift,
        ],
        4
      )
    case 'move':
      return uniqueLines(
        [
          event?.summary,
          domainState?.thesis,
          ...(frame === 'move_lease' ? applied?.moneyStyleProfile?.controlRules || [] : []),
          ...(applied?.environmentProfile?.preferredSettings || []),
          ...(applied?.environmentProfile?.resetActions || []),
          personModel?.relationshipProfile?.summary,
          domainState?.nextShift,
        ],
        4
      )
    default:
      return []
  }
}

function resolveDomainSpecificEntry(
  packet: CounselorEvidencePacketLike | null | undefined,
  domain: InterpretedAnswerDomain,
  frame?: InterpretedAnswerFrame
): string[] {
  const personModel = packet?.personModel
  const applied = personModel?.appliedProfile
  const domainState = resolveDomainState(packet, domain)
  const event = resolveDomainEvent(packet, domain)

  switch (domain) {
    case 'career':
      return uniqueLines(
        [
          event?.summary,
          ...(personModel?.careerProfile?.hiringTriggers || []),
          ...(applied?.workStyleProfile?.bestConditions || []),
          domainState?.firstMove,
        ],
        3
      )
    case 'relationship':
      return uniqueLines(
        [
          event?.summary,
          ...(personModel?.relationshipProfile?.commitmentConditions || []),
          ...(frame === 'relationship_commitment'
            ? personModel?.relationshipProfile?.inflowPaths || []
            : []),
          ...(applied?.relationshipStyleProfile?.stabilizers || []),
          domainState?.firstMove,
        ],
        3
      )
    case 'wealth':
      return uniqueLines(
        [
          event?.summary,
          ...(applied?.moneyStyleProfile?.controlRules || []),
          ...(applied?.moneyStyleProfile?.savingPattern || []),
          ...(applied?.moneyStyleProfile?.earningPattern || []),
        ],
        3
      )
    case 'health':
      return uniqueLines(
        [
          event?.summary,
          ...(applied?.lifeRhythmProfile?.recoveryWindows || []),
          ...(applied?.foodProfile?.rhythmGuidance || []),
          ...(applied?.lifeRhythmProfile?.regulationMoves || []),
        ],
        3
      )
    case 'move':
      return uniqueLines(
        [
          event?.summary,
          ...(frame === 'move_lease' ? applied?.moneyStyleProfile?.controlRules || [] : []),
          ...(applied?.environmentProfile?.preferredSettings || []),
          ...(applied?.environmentProfile?.resetActions || []),
          domainState?.firstMove,
        ],
        3
      )
    default:
      return []
  }
}

function resolveDomainSpecificAbort(
  packet: CounselorEvidencePacketLike | null | undefined,
  domain: InterpretedAnswerDomain,
  frame?: InterpretedAnswerFrame
): string[] {
  const personModel = packet?.personModel
  const applied = personModel?.appliedProfile
  const domainState = resolveDomainState(packet, domain)

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
          ...(frame === 'relationship_commitment'
            ? personModel?.uncertaintyEnvelope.conditionalAreas || []
            : []),
          ...(applied?.relationshipStyleProfile?.ruptureTriggers || []),
        ],
        3
      )
    case 'wealth':
      return uniqueLines(
        [
          ...(applied?.moneyStyleProfile?.leakageRisks || []),
          domainState?.holdMove,
          ...(personModel?.uncertaintyEnvelope.conditionalAreas || []),
        ],
        3
      )
    case 'health':
      return uniqueLines(
        [
          ...(applied?.lifeRhythmProfile?.stressBehaviors || []),
          ...(applied?.foodProfile?.cautionFoods || []),
          domainState?.holdMove,
        ],
        3
      )
    case 'move':
      return uniqueLines(
        [
          ...(frame === 'move_lease' ? applied?.moneyStyleProfile?.leakageRisks || [] : []),
          ...(applied?.environmentProfile?.drainSignals || []),
          domainState?.holdMove,
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
  domain: InterpretedAnswerDomain,
  frame?: InterpretedAnswerFrame
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
        (frame === 'relationship_commitment'
          ? personModel?.relationshipProfile?.commitmentConditions?.[0]
          : applied?.relationshipStyleProfile?.repairMoves?.[0]) ||
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
        (frame === 'move_lease' ? applied?.moneyStyleProfile?.controlRules?.[0] : undefined) ||
        applied?.environmentProfile?.resetActions?.[0] ||
        applied?.environmentProfile?.preferredSettings?.[0]
      )
    default:
      return undefined
  }
}

function resolveInterpretedTiming(input: {
  packet: CounselorEvidencePacketLike
  primaryDomain: InterpretedAnswerDomain
}) {
  const { packet, primaryDomain } = input
  const singleSubject = packet.singleSubjectView
  if (!singleSubject) {
    return {
      bestWindow: undefined,
      now: undefined,
      next: undefined,
      later: undefined,
    }
  }
  const domainState = resolveDomainState(packet, primaryDomain)
  const timescales = domainState?.timescales || []
  const bestTimescale =
    timescales.find((item) => item?.status === 'open') ||
    timescales.find((item) => item?.timescale === '1-3m') ||
    timescales.find((item) => item?.timescale === '3-6m')
  const nextTimescale =
    timescales.find((item) => item?.timescale === '1-3m') ||
    timescales.find((item) => item?.timescale === '3-6m')
  const laterTimescale =
    timescales.find((item) => item?.timescale === '6-12m') ||
    timescales.find((item) => item?.timescale === '3-6m')
  const globalWindows = singleSubject.timingState?.windows || []
  const globalNext =
    globalWindows.find((item) => item?.timescale === '1-3m') ||
    globalWindows.find((item) => item?.timescale === '3-6m')
  const globalLater =
    globalWindows.find((item) => item?.timescale === '6-12m') ||
    globalWindows.find((item) => item?.timescale === '3-6m')

  return {
    bestWindow: bestTimescale?.timescale || singleSubject.timingState?.bestWindow,
    now:
      composeLine([domainState?.thesis, singleSubject.timingState?.whyNow], 2) ||
      singleSubject.timingState?.whyNow,
    next: nextTimescale?.thesis || globalNext?.summary,
    later: laterTimescale?.thesis || globalLater?.summary,
  }
}

function buildDomainAwareBranches(input: {
  packet: CounselorEvidencePacketLike
  primaryDomain: InterpretedAnswerDomain
  entry: string[]
  abort: string[]
  frame: InterpretedAnswerFrame
}): Array<{ label: string; summary: string; nextMove: string }> {
  const { packet, primaryDomain, entry, abort, frame } = input
  const singleSubject = packet.singleSubjectView
  if (!singleSubject) return []
  const domainState = resolveDomainState(packet, primaryDomain)
  const event = resolveDomainEvent(packet, primaryDomain)
  const baseBranches = singleSubject.branches || []
  const domainNextMove =
    resolveDomainSpecificNextMove(packet, primaryDomain, frame) || singleSubject.nextMove

  const enriched = [
    {
      label:
        baseBranches[0]?.label ||
        event?.label ||
        domainState?.label ||
        singleSubject.actionAxis?.label,
      summary:
        composeLine([event?.summary, domainState?.nextShift, baseBranches[0]?.summary], 2) ||
        baseBranches[0]?.summary ||
        event?.summary ||
        domainState?.thesis ||
        singleSubject.directAnswer,
      nextMove:
        composeLine([domainNextMove, baseBranches[0]?.nextMove], 1) ||
        domainNextMove ||
        baseBranches[0]?.nextMove ||
        singleSubject.nextMove,
    },
    {
      label:
        baseBranches[1]?.label ||
        domainState?.label ||
        singleSubject.structureAxis?.label ||
        event?.label,
      summary:
        composeLine([domainState?.thesis, entry[0], baseBranches[1]?.summary], 2) ||
        baseBranches[1]?.summary ||
        domainState?.thesis ||
        entry[0],
      nextMove:
        composeLine([domainState?.firstMove, entry[0], baseBranches[1]?.nextMove], 1) ||
        domainState?.firstMove ||
        baseBranches[1]?.nextMove ||
        domainNextMove,
    },
    {
      label:
        baseBranches[2]?.label ||
        singleSubject.riskAxis?.label ||
        domainState?.label ||
        event?.label,
      summary:
        composeLine([singleSubject.riskAxis?.warning, abort[0], baseBranches[2]?.summary], 2) ||
        baseBranches[2]?.summary ||
        singleSubject.riskAxis?.warning ||
        abort[0],
      nextMove:
        composeLine([domainState?.holdMove, abort[0], baseBranches[2]?.nextMove], 1) ||
        domainState?.holdMove ||
        baseBranches[2]?.nextMove ||
        singleSubject.nextMove,
    },
  ]

  return enriched
    .filter((branch) => branch.label && branch.summary && branch.nextMove)
    .slice(0, 3) as Array<{ label: string; summary: string; nextMove: string }>
}

const INTERPRETED_ANSWER_INTERNAL_LEAK_REGEX =
  /(action axis|risk axis|structure axis|questionframe=|primary_domain=|why_\d+=|next_move=|frame=|timing_best=|timing_now=|_window\b|scenario id)/i

export function evaluateInterpretedAnswerQuality(
  contract: InterpretedAnswerContract | null | undefined
): InterpretedAnswerQualityResult {
  if (!contract) {
    return { pass: false, warnings: ['missing_contract'] }
  }

  const warnings: string[] = []
  const directAnswer = String(contract.directAnswer || '').trim()
  const nextMove = String(contract.nextMove || '').trim()

  if (!directAnswer) warnings.push('missing_direct_answer')
  if (!nextMove) warnings.push('missing_next_move')
  if ((contract.why || []).filter(Boolean).length === 0) warnings.push('missing_why_lines')
  if (INTERPRETED_ANSWER_INTERNAL_LEAK_REGEX.test(directAnswer)) {
    warnings.push('direct_answer_internal_leak')
  }
  if (INTERPRETED_ANSWER_INTERNAL_LEAK_REGEX.test(nextMove)) {
    warnings.push('next_move_internal_leak')
  }
  if (
    (contract.branches || []).some((branch) =>
      INTERPRETED_ANSWER_INTERNAL_LEAK_REGEX.test(branch.summary)
    )
  ) {
    warnings.push('branch_internal_leak')
  }

  return {
    pass: warnings.length === 0,
    warnings,
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
  const effectiveDomain = resolveEffectiveDomain(frame, primaryDomain)

  const event = resolveDomainEvent(packet, effectiveDomain)
  const domainState = resolveDomainState(packet, effectiveDomain)

  const why = uniqueLines(
    [
      singleSubject.actionAxis?.whyThisFirst,
      domainState?.thesis,
      event?.summary,
      ...resolveDomainSpecificWhy(packet, effectiveDomain, frame),
      resolveAppliedSummary(packet, effectiveDomain),
      packet?.topTimingWindow?.timingConflictNarrative,
    ],
    4
  )
  const prioritizedEntry = resolveDomainSpecificEntry(packet, effectiveDomain, frame)
  const prioritizedAbort = resolveDomainSpecificAbort(packet, effectiveDomain, frame)

  const entry = uniqueLines(
    [
      ...prioritizedEntry,
      ...(event?.entryConditions || []),
      ...(singleSubject.entryConditions || []),
      ...(domainState?.timescales?.[0]?.entryConditions || []),
    ],
    3
  )
  const abort = uniqueLines(
    [
      ...prioritizedAbort,
      ...(event?.abortConditions || []),
      ...(singleSubject.abortConditions || []),
      ...(domainState?.timescales?.[0]?.abortConditions || []),
      ...(singleSubject.riskAxis?.hardStops || []),
    ],
    3
  )
  const branches = (singleSubject.branches || []).slice(0, 3).map((branch) => ({
    label: branch.label,
    summary: branch.summary,
    nextMove: branch.nextMove,
  }))
  const domainAwareBranches = buildDomainAwareBranches({
    packet,
    primaryDomain: effectiveDomain,
    entry,
    abort,
    frame,
  })

  return {
    questionFrame: frame,
    primaryDomain: effectiveDomain,
    directAnswer: singleSubject.directAnswer,
    why,
    timing: resolveInterpretedTiming({ packet, primaryDomain: effectiveDomain }),
    conditions: {
      entry,
      abort,
    },
    branches: domainAwareBranches.length > 0 ? domainAwareBranches : branches,
    uncertainty: resolveUncertainty(packet, effectiveDomain),
    nextMove:
      resolveDomainSpecificNextMove(packet, effectiveDomain, frame) ||
      domainState?.firstMove ||
      singleSubject.nextMove,
  }
}
