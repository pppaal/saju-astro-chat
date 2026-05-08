import type { SignalDomain } from './signalSynthesizer'
import type { DestinyCoreResult } from './runDestinyCore'
import type {
  AdapterBirthTimeHypothesis,
  AdapterCrossConflictItem,
  AdapterPersonAppliedProfile,
  AdapterPersonDomainState,
  AdapterPersonEventOutlook,
  AdapterPersonModel,
  AdapterPastEventMarker,
  AdapterPersonUncertaintyEnvelope,
} from './adaptersTypes'
import { localizeDomain, rankRiskAxis } from './adaptersPresentation'
import {
  avg,
  buildDomainPortraits,
  buildFutureBranches,
  buildPeakWindows,
  buildRecoveryWindows,
  calculateProfileAge,
  formatAgeWindow,
  formatBirthTimeCandidate,
  getBirthBucketLabel,
  getCandidateActionFit,
  getCandidateRecoveryFit,
  hourToBucket,
  mapDomainState,
  mapTimingStatus,
  normalizePersonModelList,
  normalizePersonModelText,
  normalizeHour,
  parseBirthHour,
  round2,
  uniq,
} from './adaptersPersonModelProfileSupport'

export function mapCurrentStateToEventStatus(
  state: AdapterPersonDomainState['currentState']
): AdapterPersonEventOutlook['status'] {
  if (state === 'expansion' || state === 'stable') return 'open'
  if (state === 'blocked') return 'blocked'
  return 'mixed'
}

export function buildDomainStateGraph(
  core: DestinyCoreResult,
  locale: 'ko' | 'en'
): AdapterPersonDomainState[] {
  const portraits = buildDomainPortraits(core, locale)
  const timingWindows = core.canonical.domainTimingWindows

  return portraits.map((portrait) => {
    const manifestation = core.canonical.manifestations.find(
      (item) => item.domain === portrait.domain
    )
    const timing = timingWindows.find((item) => item.domain === portrait.domain)
    const crossRow = (core.canonical.crossAgreementMatrix || []).find(
      (item) => item.domain === portrait.domain
    )
    const supportSignals = uniq(
      [
        ...(manifestation?.activationSources || [])
          .filter((source) => source.active)
          .map((source) => normalizePersonModelText(source.label, locale)),
        ...portrait.likelyExpressions,
        ...portrait.allowedActions,
      ].filter(Boolean)
    ).slice(0, 4)
    const pressureSignals = normalizePersonModelList(
      [...portrait.riskExpressions, ...portrait.blockedActions].filter(Boolean),
      locale
    ).slice(0, 4)
    const currentState = mapDomainState(
      portrait.mode,
      portrait.supportScore,
      portrait.pressureScore
    )
    const alignedWith = portraits
      .filter(
        (other) =>
          other.domain !== portrait.domain &&
          other.supportScore >= other.pressureScore &&
          Math.abs(other.activationScore - portrait.activationScore) <= 0.18
      )
      .map((other) => other.domain)
      .slice(0, 2)
    const conflictingWith = portraits
      .filter(
        (other) =>
          other.domain !== portrait.domain &&
          (other.pressureScore > other.supportScore ||
            (portrait.mode === 'execute' && other.mode === 'prepare'))
      )
      .sort((left, right) => right.pressureScore - left.pressureScore)
      .map((other) => other.domain)
      .slice(0, 2)
    const timescales = (['now', '1-3m', '3-6m', '6-12m'] as const).map((timescale) => {
      const cell = crossRow?.timescales?.[timescale]
      const status = mapTimingStatus(cell?.agreement || 0, cell?.contradiction || 0)
      return {
        timescale,
        status,
        thesis: normalizePersonModelText(
          locale === 'ko'
            ? `${portrait.label} ì¶•ì€ ${timescale} êµ¬ê°„ì—ì„œ ${status === 'open' ? 'ì—´ë¦¼' : status === 'blocked' ? 'ë°©ì–´' : 'í˜¼í•©'} ìƒíƒœë¡œ ì½íž™ë‹ˆë‹¤.`
            : `${portrait.label} reads as ${
                status === 'open' ? 'open' : status === 'blocked' ? 'defensive' : 'mixed'
              } in the ${timescale} window.`,
          locale
        ),
        entryConditions: normalizePersonModelList(
          (timing?.entryConditions || []).slice(0, 2),
          locale
        ),
        abortConditions: normalizePersonModelList(
          (timing?.abortConditions || []).slice(0, 2),
          locale
        ),
      }
    })
    const nextShift = timescales.find(
      (item) => item.timescale !== 'now' && item.status !== timescales[0]?.status
    )

    return {
      domain: portrait.domain,
      label: portrait.label,
      currentState,
      currentWindow: portrait.timingWindow,
      thesis: normalizePersonModelText(
        portrait.activationThesis || portrait.baselineThesis || portrait.summary,
        locale
      ),
      supportSignals,
      pressureSignals,
      alignedWith,
      conflictingWith,
      nextShift: nextShift?.timescale,
      firstMove: portrait.allowedActions[0] || supportSignals[0] || core.canonical.primaryAction,
      holdMove:
        portrait.blockedActions[0] ||
        pressureSignals[0] ||
        core.canonical.judgmentPolicy.hardStops[0] ||
        core.canonical.primaryCaution,
      timescales,
    }
  })
}

export function buildAppliedProfile(
  core: DestinyCoreResult,
  locale: 'ko' | 'en',
  domainStateGraph: AdapterPersonDomainState[]
): AdapterPersonAppliedProfile {
  const birthHour = parseBirthHour(core.normalizedInput.profileContext?.birthTime)
  const healthState = domainStateGraph.find((item) => item.domain === 'health')
  const careerState = domainStateGraph.find((item) => item.domain === 'career')
  const relationshipState = domainStateGraph.find((item) => item.domain === 'relationship')
  const wealthState = domainStateGraph.find((item) => item.domain === 'wealth')
  const topPressure = domainStateGraph
    .flatMap((item) => item.pressureSignals)
    .filter(Boolean)
    .slice(0, 4)
  const topSupport = domainStateGraph
    .flatMap((item) => item.supportSignals)
    .filter(Boolean)
    .slice(0, 4)

  return {
    foodProfile: {
      summary:
        locale === 'ko'
          ? 'ì´ êµ¬ì¡°ëŠ” ê°•í•œ ìžê·¹ì‹ë³´ë‹¤ ì†Œí™” ë¶€ë‹´ì´ ë‚®ê³  ë¦¬ë“¬ì´ ì¼ì •í•œ ì‹ì‚¬ê°€ ë” ì•ˆì •ì ìœ¼ë¡œ ë§žìŠµë‹ˆë‹¤.'
          : 'This profile responds better to low-load, rhythm-consistent meals than to high-stimulus eating.',
      thermalBias:
        healthState?.currentState === 'defensive' || healthState?.currentState === 'blocked'
          ? locale === 'ko'
            ? 'ë”°ëœ»í•˜ê³  ì•ˆì •ì ì¸ ì‹ì‚¬ ìª½'
            : 'Toward warm and steady meals'
          : locale === 'ko'
            ? 'ì¤‘ê°„ ì˜¨ë„ì˜ ê· í˜• ì‹ì‚¬ ìª½'
            : 'Toward balanced-temperature meals',
      digestionStyle:
        locale === 'ko'
          ? 'ê³µë³µ í›„ ê³¼ì‹ë³´ë‹¤ ìž‘ì€ ì‹ì‚¬ ê°„ê²© ìœ ì§€ê°€ ìœ ë¦¬í•©ë‹ˆë‹¤.'
          : 'Smaller meal spacing works better than fasting followed by heavy intake.',
      helpfulFoods:
        locale === 'ko'
          ? [
              'êµ­ë¬¼í˜• ì‹ì‚¬',
              'ë‹¨ë°±ì§ˆê³¼ ê³¡ë¬¼ì„ ê°™ì´ ë‘” ê·œì¹™ì‹',
              'ë‚® ì‹œê°„ëŒ€ ìˆ˜ë¶„ ë³´ì¶©',
            ]
          : ['Broth-based meals', 'Protein-and-grain regular meals', 'Daytime hydration'],
      cautionFoods:
        locale === 'ko'
          ? ['ì•¼ì‹ê³¼ ê³µë³µ í›„ í­ì‹', 'ì¹´íŽ˜ì¸ìœ¼ë¡œ ë²„í‹°ëŠ” ì‹ì‚¬', 'ë‹¹ë¶„ ê¸‰ìƒìŠ¹ ê°„ì‹']
          : ['Late-night heavy meals', 'Caffeine-driven meal skipping', 'Sugar-spike snacking'],
      rhythmGuidance:
        locale === 'ko'
          ? [
              'ì²« ì§‘ì¤‘ ë¸”ë¡ ì „ì— ê°€ë²¼ìš´ ì—°ë£Œë¥¼ ë¨¼ì € ë„£ìœ¼ì„¸ìš”.',
              'ì €ë…ì—ëŠ” ìžê·¹ì‹ë³´ë‹¤ íšŒë³µì‹ìœ¼ë¡œ ë§ˆë¬´ë¦¬í•˜ì„¸ìš”.',
            ]
          : [
              'Fuel before the first focus block.',
              'End the evening with recovery meals rather than stimulation.',
            ],
    },
    lifeRhythmProfile: {
      summary:
        locale === 'ko'
          ? 'ì´ ì‚¬ëžŒì€ ëª°ìž… ë¸”ë¡ê³¼ íšŒë³µ ë¸”ë¡ì„ ì˜ë„ì ìœ¼ë¡œ ë¶„ë¦¬í• ìˆ˜ë¡ ì„±ê³¼ê°€ ì„ ëª…í•´ì§‘ë‹ˆë‹¤.'
          : 'This person performs better when deep-focus blocks and recovery blocks are separated on purpose.',
      peakWindows: buildPeakWindows(birthHour, locale),
      recoveryWindows: buildRecoveryWindows(birthHour, locale),
      stressBehaviors:
        topPressure.length > 0
          ? topPressure
          : locale === 'ko'
            ? [
                'ê³¼í•œ ê²€í† ë¡œ ì‹¤í–‰ì´ ëŠ¦ì–´ì§',
                'ìžê·¹ì´ ë§Žì•„ì§ˆìˆ˜ë¡ íšŒë³µì´ ë’¤ë¡œ ë°€ë¦¼',
              ]
            : ['Over-review delays execution', 'Recovery gets pushed back as stimulation rises'],
      regulationMoves:
        locale === 'ko'
          ? [
              'í•˜ë£¨ì— ê²°ì • ë¸”ë¡ì„ ë‘ ë²ˆ ì´ìƒ ì—´ì§€ ë§ˆì„¸ìš”.',
              'ì‹¤í–‰ ì „ 10ë¶„ ì •ë¦¬ ë£¨í‹´ì„ ê³ ì •í•˜ì„¸ìš”.',
            ]
          : [
              'Do not open more than two decision blocks a day.',
              'Lock a 10-minute reset routine before execution.',
            ],
    },
    relationshipStyleProfile: {
      summary:
        relationshipState?.thesis ||
        (locale === 'ko'
          ? 'ê´€ê³„ëŠ” ê°ì •ë³´ë‹¤ ì¡°ê±´ê³¼ ë¦¬ë“¬ì´ ë§žì„ ë•Œ ë” ì•ˆì •ì ìœ¼ë¡œ ìœ ì§€ë©ë‹ˆë‹¤.'
          : 'Relationships stabilize when conditions and rhythm fit, not just emotion.'),
      attractionPatterns: relationshipState?.supportSignals.slice(0, 4) || [],
      stabilizers:
        locale === 'ko'
          ? [
              'ê´€ê³„ ê¸°ëŒ€ì¹˜ë¥¼ ë§ë¡œ ë¨¼ì € ë§žì¶”ê¸°',
              'ì†ë„ë³´ë‹¤ ì±…ìž„ ë²”ìœ„ë¶€í„° í•©ì˜í•˜ê¸°',
            ]
          : ['Align expectations in words first', 'Agree on responsibility before pace'],
      ruptureTriggers: relationshipState?.pressureSignals.slice(0, 4) || [],
      repairMoves:
        locale === 'ko'
          ? [
              'ì¹¨ë¬µìœ¼ë¡œ ë²„í‹°ì§€ ë§ê³  ì²´í¬ì¸ ê°„ê²©ì„ ì •í•˜ì„¸ìš”.',
              'ë¬¸ì œë³´ë‹¤ ì—­í• ê³¼ ê²½ê³„ë¥¼ ë¨¼ì € ë‹¤ì‹œ ì •ë¦¬í•˜ì„¸ìš”.',
            ]
          : [
              'Set a check-in interval instead of going silent.',
              'Re-define role and boundary before debating the problem.',
            ],
    },
    workStyleProfile: {
      summary:
        careerState?.thesis ||
        (locale === 'ko'
          ? 'ì„±ê³¼ëŠ” ê°ê°ë³´ë‹¤ êµ¬ì¡°ì™€ ê¸°ì¤€ì„ ë¨¼ì € ì„¸ìš¸ ë•Œ ë” ìž˜ ë‚©ë‹ˆë‹¤.'
          : 'Performance improves when structure and criteria are set before speed.'),
      bestRoles: careerState?.supportSignals.slice(0, 4) || [],
      bestConditions:
        locale === 'ko'
          ? ['ì—­í•  ë²”ìœ„ê°€ ë¬¸ì„œí™”ëœ í™˜ê²½', 'ì¤‘ê°„ ì ê²€ì´ ê°€ëŠ¥í•œ ë‹¨ê³„í˜• ì—…ë¬´']
          : ['Documented role scope', 'Step-based work with review checkpoints'],
      fatigueTriggers: careerState?.pressureSignals.slice(0, 4) || [],
      leverageMoves:
        locale === 'ko'
          ? [
              'ê²°ì • ì „ì— ê¸°ì¤€í‘œë¥¼ ë¨¼ì € ë§Œë“¤ê¸°',
              'í•œ ë²ˆì— í° ì í”„ë³´ë‹¤ ë‹¨ê³„í˜• ìŠ¹ë¶€ë¡œ ê°€ê¸°',
            ]
          : [
              'Build the criteria sheet before deciding',
              'Choose staged leverage over one large jump',
            ],
    },
    moneyStyleProfile: {
      summary:
        wealthState?.thesis ||
        (locale === 'ko'
          ? 'ëˆì€ í•œ ë²ˆì˜ ìŠ¹ë¶€ë³´ë‹¤ ëˆ„ì  êµ¬ì¡°ì™€ ìƒˆëŠ” ì§€ì  ê´€ë¦¬ì—ì„œ ë” ìž˜ ë¶™ìŠµë‹ˆë‹¤.'
          : 'Money grows better through cumulative structure and leakage control than through one big swing.'),
      earningPattern: wealthState?.supportSignals.slice(0, 4) || topSupport.slice(0, 4),
      savingPattern:
        locale === 'ko'
          ? [
              'ìžë™ ì´ì²´ì²˜ëŸ¼ ë°˜ë³µ êµ¬ì¡° ë§Œë“¤ê¸°',
              'ì„±ê³¼ê¸ˆë³´ë‹¤ ê³ ì • íë¦„ ë¨¼ì € ì•ˆì •í™”í•˜ê¸°',
            ]
          : ['Create repeatable transfer structures', 'Stabilize fixed flow before bonus chasing'],
      leakageRisks: wealthState?.pressureSignals.slice(0, 4) || [],
      controlRules:
        locale === 'ko'
          ? [
              'í° ê²°ì œëŠ” í•˜ë£¨ ìž¬í™•ì¸ í›„ ì§„í–‰í•˜ê¸°',
              'ê¸°ë¶„ ì†Œë¹„ì™€ ì—…ë¬´ ì†Œë¹„ë¥¼ ë¶„ë¦¬í•˜ê¸°',
            ]
          : ['Recheck large spending after one day', 'Separate mood spending from work spending'],
    },
    environmentProfile: {
      summary:
        locale === 'ko'
          ? 'í™˜ê²½ì€ í™”ë ¤í•¨ë³´ë‹¤ ì†ŒìŒê³¼ ìžê·¹ì„ ì¡°ì ˆí•  ìˆ˜ ìžˆì„ ë•Œ ë” ìž˜ ë§žìŠµë‹ˆë‹¤.'
          : 'Environment fits better when noise and stimulation are controllable rather than flashy.',
      preferredSettings:
        locale === 'ko'
          ? [
              'í˜¼ìž ì •ë¦¬í•  ìˆ˜ ìžˆëŠ” ë‹«ížŒ ê³µê°„',
              'ë¹›ê³¼ ì†ŒìŒì„ ì¡°ì ˆí•  ìˆ˜ ìžˆëŠ” ìž‘ì—… í™˜ê²½',
            ]
          : ['Closed space for solo consolidation', 'Work setting with light/noise control'],
      drainSignals: topPressure.slice(0, 4),
      resetActions:
        locale === 'ko'
          ? [
              'ì‹œì•¼ì— ë‚¨ëŠ” í•  ì¼ì„ ì„¸ ê°œ ì´í•˜ë¡œ ì¤„ì´ê¸°',
              'ë°¤ì—ëŠ” í™”ë©´ ìžê·¹ì„ ì¤„ì´ê³  íšŒë³µ ë£¨í‹´ìœ¼ë¡œ ì „í™˜í•˜ê¸°',
            ]
          : [
              'Reduce visible open tasks to three or fewer',
              'Shift from screen stimulation into a recovery routine at night',
            ],
    },
  }
}

export function buildEventOutlook(
  core: DestinyCoreResult,
  locale: 'ko' | 'en',
  domainStateGraph: AdapterPersonDomainState[],
  relationshipProfile: AdapterPersonModel['relationshipProfile'],
  careerProfile: AdapterPersonModel['careerProfile']
): AdapterPersonEventOutlook[] {
  const futureBranches = buildFutureBranches(core, locale)
  const portraits = buildDomainPortraits(core, locale)
  const eventDefs: Array<{
    key: AdapterPersonEventOutlook['key']
    label: string
    domain: SignalDomain
  }> = [
    {
      key: 'careerEntry',
      label: locale === 'ko' ? 'ì·¨ì—…/í¬ì§€ì…˜ ì§„ìž…' : 'Career Entry',
      domain: 'career',
    },
    {
      key: 'partnerEntry',
      label: locale === 'ko' ? 'ê´€ê³„ ìœ ìž…' : 'Partner Entry',
      domain: 'relationship',
    },
    {
      key: 'commitment',
      label: locale === 'ko' ? 'ê´€ê³„ í™•ì •/ê²°í˜¼' : 'Commitment',
      domain: 'relationship',
    },
    {
      key: 'moneyBuild',
      label: locale === 'ko' ? 'ëˆ íë¦„ êµ¬ì¶•' : 'Money Build',
      domain: 'wealth',
    },
    {
      key: 'healthReset',
      label: locale === 'ko' ? 'íšŒë³µ/ê±´ê°• ë¦¬ì…‹' : 'Health Reset',
      domain: 'health',
    },
  ]

  return eventDefs.map((eventDef): AdapterPersonEventOutlook => {
    const state = domainStateGraph.find((item) => item.domain === eventDef.domain)
    const portrait = portraits.find((item) => item.domain === eventDef.domain)
    const branch = futureBranches.find((item) => item.domain === eventDef.domain)
    const readiness = round2(
      avg([
        portrait?.activationScore || 0,
        portrait?.supportScore || 0,
        portrait?.structuralScore || 0,
      ])
    )
    const baseEntry: string[] =
      eventDef.key === 'commitment'
        ? relationshipProfile.commitmentConditions
        : eventDef.key === 'careerEntry'
          ? careerProfile.hiringTriggers
          : branch?.conditions || state?.supportSignals || []
    const baseAbort: string[] =
      eventDef.key === 'commitment'
        ? relationshipProfile.breakPatterns
        : branch?.blockers || state?.pressureSignals || []
    const nextMove =
      state?.firstMove ||
      baseEntry[0] ||
      portrait?.allowedActions?.[0] ||
      core.canonical.primaryAction

    return {
      key: eventDef.key,
      label: eventDef.label,
      domain: eventDef.domain,
      status: mapCurrentStateToEventStatus(state?.currentState || 'mixed'),
      readiness,
      bestWindow: branch?.window || state?.currentWindow,
      summary: normalizePersonModelText(
        branch?.summary ||
          state?.thesis ||
          portrait?.summary ||
          (locale === 'ko'
            ? `${eventDef.label} ì‚¬ê±´ì€ ${localizeDomain(eventDef.domain, locale)} ì¶• ì¡°ê±´ì´ ë§žì„ ë•Œ ì—´ë¦½ë‹ˆë‹¤.`
            : `${eventDef.label} opens when the ${localizeDomain(eventDef.domain, locale)} axis conditions line up.`),
        locale
      ),
      entryConditions: normalizePersonModelList(
        uniq(baseEntry.filter((item): item is string => typeof item === 'string')).slice(0, 4),
        locale
      ),
      abortConditions: normalizePersonModelList(
        uniq(baseAbort.filter((item): item is string => typeof item === 'string')).slice(0, 4),
        locale
      ),
      nextMove: normalizePersonModelText(nextMove, locale),
    }
  })
}

export function buildBirthTimeHypotheses(
  core: DestinyCoreResult,
  locale: 'ko' | 'en',
  domainStateGraph: AdapterPersonDomainState[]
): AdapterBirthTimeHypothesis[] {
  const rectificationCandidates =
    core.normalizedInput.profileContext?.birthTimeRectification?.candidates || []
  if (rectificationCandidates.length) {
    return rectificationCandidates
      .map((item) => {
        const parsedHour = parseBirthHour(item.birthTime)
        const bucket = hourToBucket(parsedHour === null ? 12 : parsedHour)
        return {
          label: item.label || getBirthBucketLabel(bucket, locale),
          birthTime: item.birthTime,
          bucket,
          status: item.status || 'plausible',
          fitScore: round2(item.fitScore || 0),
          confidence: round2(item.confidence || item.fitScore || 0),
          summary:
            item.summary ||
            (locale === 'ko'
              ? `${item.birthTime} ìƒì‹œëŠ” ìž¬í‰ê°€ í›„ë³´ë¡œ ìœ ì§€ë©ë‹ˆë‹¤.`
              : `${item.birthTime} remains a reevaluated birth-time candidate.`),
          supportSignals: uniq(
            (item.supportSignals || []).filter(
              (signal): signal is string => typeof signal === 'string'
            )
          ).slice(0, 3),
          cautionSignals: uniq(
            (item.cautionSignals || []).filter(
              (signal): signal is string => typeof signal === 'string'
            )
          ).slice(0, 3),
          coreDiff: item.coreDiff
            ? {
                directAnswer: item.coreDiff.directAnswer || '',
                actionDomain: item.coreDiff.actionDomain || '',
                riskDomain: item.coreDiff.riskDomain || '',
                bestWindow: item.coreDiff.bestWindow || '',
                branchSummary: item.coreDiff.branchSummary || '',
              }
            : undefined,
        }
      })
      .sort((left, right) => right.fitScore - left.fitScore)
  }

  const rawHour = parseBirthHour(core.normalizedInput.profileContext?.birthTime)
  const actionState =
    domainStateGraph.find((item) => item.domain === core.canonical.actionFocusDomain) ||
    domainStateGraph[0]
  const riskState =
    domainStateGraph.find((item) => item.domain === rankRiskAxis(core)) || domainStateGraph[1]
  const candidateHours =
    rawHour === null
      ? [6, 12, 18]
      : uniq([rawHour, normalizeHour(rawHour - 2), normalizeHour(rawHour + 2)])

  const hypotheses = candidateHours.map((hour) => {
    const bucket = hourToBucket(hour)
    const actionFit = getCandidateActionFit(bucket, actionState?.currentState)
    const recoveryFit = getCandidateRecoveryFit(bucket, riskState?.currentState)
    const proximityScore =
      rawHour === null ? 0.46 : hour === rawHour ? 0.92 : Math.abs(hour - rawHour) <= 2 ? 0.7 : 0.54
    const fitScore = round2(avg([actionFit, recoveryFit, proximityScore]))
    const confidence = round2(rawHour === null ? fitScore * 0.58 : fitScore * 0.82)

    return {
      label: getBirthBucketLabel(bucket, locale),
      birthTime: formatBirthTimeCandidate(hour),
      bucket,
      status: 'plausible' as const,
      fitScore,
      confidence,
      summary:
        locale === 'ko'
          ? `${formatBirthTimeCandidate(hour)} ì „í›„ë¡œ ì½ìœ¼ë©´ ${actionState?.label || 'í•µì‹¬ ì¶•'} ì‹¤í–‰ ë¦¬ë“¬ê³¼ ${riskState?.label || 'ë¦¬ìŠ¤í¬ ì¶•'} íšŒë³µ ë¦¬ë“¬ì´ ${fitScore >= 0.72 ? 'ë¹„êµì  ìž˜ ë§žìŠµë‹ˆë‹¤' : fitScore >= 0.58 ? 'ë¶€ë¶„ì ìœ¼ë¡œ ë§žìŠµë‹ˆë‹¤' : 'ë¯¼ê°í•˜ê²Œ í”ë“¤ë¦½ë‹ˆë‹¤'}.`
          : `Around ${formatBirthTimeCandidate(hour)}, the action rhythm on ${actionState?.label || 'the lead axis'} and the recovery rhythm on ${riskState?.label || 'the risk axis'} ${fitScore >= 0.72 ? 'fit reasonably well' : fitScore >= 0.58 ? 'fit partially' : 'remain sensitive'}.`,
      supportSignals: uniq([
        ...(buildPeakWindows(hour, locale).slice(0, 2) || []),
        actionState?.firstMove || '',
        ...(actionState?.supportSignals || []).slice(0, 1),
      ]).filter(Boolean),
      cautionSignals: uniq([
        ...(buildRecoveryWindows(hour, locale).slice(0, 1) || []),
        riskState?.holdMove || '',
        ...(riskState?.pressureSignals || []).slice(0, 1),
      ]).filter(Boolean),
    }
  })

  const topFit = Math.max(...hypotheses.map((item) => item.fitScore), 0)
  return hypotheses
    .sort((left, right) => right.fitScore - left.fitScore)
    .map((item) => ({
      ...item,
      status:
        rawHour !== null && item.birthTime === formatBirthTimeCandidate(rawHour)
          ? 'current-best'
          : item.fitScore >= topFit - 0.06
            ? 'plausible'
            : 'low-fit',
    }))
}

export function buildCrossConflictMap(
  core: DestinyCoreResult,
  locale: 'ko' | 'en',
  domainStateGraph: AdapterPersonDomainState[]
): AdapterCrossConflictItem[] {
  const matrix = core.canonical.crossAgreementMatrix || []

  const items = domainStateGraph.map((state) => {
    const row = matrix.find((item) => item.domain === state.domain)
    const timescalePairs = (['now', '1-3m', '3-6m', '6-12m'] as const).map((timescale) => ({
      timescale,
      agreement: row?.timescales?.[timescale]?.agreement || 0,
      contradiction: row?.timescales?.[timescale]?.contradiction || 0,
      leadLag: row?.timescales?.[timescale]?.leadLag ?? row?.leadLag ?? 0,
    }))
    const strongest = timescalePairs
      .slice()
      .sort(
        (left, right) =>
          right.contradiction +
          Math.abs(right.leadLag) -
          (left.contradiction + Math.abs(left.leadLag))
      )[0]
    const status: AdapterCrossConflictItem['status'] =
      strongest && strongest.contradiction < 0.26 && Math.abs(strongest.leadLag) < 0.12
        ? 'aligned'
        : (strongest?.leadLag || 0) <= -0.16
          ? 'saju-leading'
          : (strongest?.leadLag || 0) >= 0.16
            ? 'astro-leading'
            : 'contested'

    const sajuView =
      locale === 'ko'
        ? `${state.label} êµ¬ì¡°ëŠ” ${state.firstMove} ìª½ì´ ë¨¼ì € ë§žìŠµë‹ˆë‹¤.`
        : `The structural read on ${state.label} points first toward ${state.firstMove}.`
    const astroView =
      locale === 'ko'
        ? `${state.label} ì´‰ë°œì€ ${state.nextShift || strongest?.timescale || 'í˜„ìž¬'} êµ¬ê°„ì—ì„œ ë” ì„ ëª…í•´ì§‘ë‹ˆë‹¤.`
        : `The timing trigger on ${state.label} becomes clearer in the ${state.nextShift || strongest?.timescale || 'current'} window.`
    const summary =
      locale === 'ko'
        ? status === 'aligned'
          ? `${state.label} ì¶•ì€ ì‚¬ì£¼ êµ¬ì¡°ì™€ ì ì„± íƒ€ì´ë°ì´ ëŒ€ì²´ë¡œ ê°™ì€ ë°©í–¥ì„ ê°€ë¦¬í‚µë‹ˆë‹¤.`
          : status === 'saju-leading'
            ? `${state.label} ì¶•ì€ êµ¬ì¡° ì§€ì§€ëŠ” ë¨¼ì € í˜•ì„±ëì§€ë§Œ ì ì„± íŠ¸ë¦¬ê±°ëŠ” ì•½ê°„ ëŠ¦ê²Œ ë¶™ìŠµë‹ˆë‹¤.`
            : status === 'astro-leading'
              ? `${state.label} ì¶•ì€ ì ì„± ì´‰ë°œì´ ë¨¼ì € ì•žì„œê³  êµ¬ì¡°ì  ìˆ˜ìš©ì€ ë’¤ë”°ë¦…ë‹ˆë‹¤.`
              : `${state.label} ì¶•ì€ êµ¬ì¡°ì™€ íƒ€ì´ë°ì´ ê°™ì€ ì†ë„ë¡œ ì›€ì§ì´ì§€ ì•Šì•„ í•´ì„ ê¸´ìž¥ì´ í½ë‹ˆë‹¤.`
        : status === 'aligned'
          ? `${state.label} shows broad alignment between structure and timing.`
          : status === 'saju-leading'
            ? `${state.label} has structure support first, while timing triggers lag.`
            : status === 'astro-leading'
              ? `${state.label} has timing triggers first, while structural support lags.`
              : `${state.label} carries meaningful tension between structure and timing.`

    return {
      domain: state.domain,
      label: state.label,
      status,
      strongestTimescale: strongest?.timescale,
      summary,
      sajuView,
      astroView,
      resolutionMove: status === 'aligned' ? state.firstMove : state.holdMove || state.firstMove,
    }
  })

  return items
    .sort((left, right) => {
      const score = (item: AdapterCrossConflictItem) =>
        item.status === 'contested'
          ? 3
          : item.status === 'astro-leading' || item.status === 'saju-leading'
            ? 2
            : 1
      return score(right) - score(left)
    })
    .slice(0, 4)
}

export function buildPastEventReconstruction(
  core: DestinyCoreResult,
  locale: 'ko' | 'en',
  domainStateGraph: AdapterPersonDomainState[]
): {
  summary: string
  markers: AdapterPastEventMarker[]
} {
  const age = calculateProfileAge(
    core.normalizedInput.profileContext?.birthDate,
    core.normalizedInput.currentDateIso
  )
  const actionState =
    domainStateGraph.find((item) => item.domain === core.canonical.actionFocusDomain) ||
    domainStateGraph[0]
  const riskState =
    domainStateGraph.find((item) => item.domain === rankRiskAxis(core)) ||
    domainStateGraph.find((item) => item.domain === 'health') ||
    domainStateGraph[1]
  const relationshipState = domainStateGraph.find((item) => item.domain === 'relationship')

  const markers: AdapterPastEventMarker[] = [
    {
      key: 'identity-reset',
      label: locale === 'ko' ? 'ì •ì²´ì„± ìž¬ì •ë ¬ êµ¬ê°„' : 'Identity reset window',
      ageWindow:
        age === null
          ? locale === 'ko'
            ? '18-22ì„¸'
            : 'ages 18-22'
          : formatAgeWindow(Math.max(16, age - 12), Math.max(20, age - 8), locale),
      status: core.normalizedInput.profileContext?.birthDate ? 'anchored' : 'conditional',
      summary:
        locale === 'ko'
          ? `${core.canonical.focusDomain === core.canonical.actionFocusDomain ? actionState?.label || 'í•µì‹¬ ì¶•' : localizeDomain(core.canonical.focusDomain, locale)} íŒ¨í„´ì´ ì´ ì‹œê¸°ë¶€í„° ìƒí™œ ìŠµê´€ìœ¼ë¡œ êµ³ì—ˆì„ ê°€ëŠ¥ì„±ì´ í½ë‹ˆë‹¤.`
          : `The ${actionState?.label || localizeDomain(core.canonical.focusDomain, locale)} pattern likely started consolidating into habit in this window.`,
      evidence: uniq([
        ...(core.canonical.topPatterns.slice(0, 2).map((item) => item.family) || []),
        ...(core.canonical.coherenceAudit.notes || []).slice(0, 1),
      ]).filter(Boolean),
    },
    {
      key:
        core.canonical.actionFocusDomain === 'career'
          ? 'career-pivot'
          : core.canonical.actionFocusDomain === 'relationship'
            ? 'relationship-lesson'
            : core.canonical.actionFocusDomain === 'wealth'
              ? 'money-reset'
              : 'career-pivot',
      label:
        core.canonical.actionFocusDomain === 'relationship'
          ? locale === 'ko'
            ? 'ê´€ê³„ í•™ìŠµ êµ¬ê°„'
            : 'Relationship lesson window'
          : core.canonical.actionFocusDomain === 'wealth'
            ? locale === 'ko'
              ? 'ìž¬ì • ìž¬ë°°ì—´ êµ¬ê°„'
              : 'Money reset window'
            : locale === 'ko'
              ? 'ì»¤ë¦¬ì–´ ë°©í–¥ ì „í™˜ êµ¬ê°„'
              : 'Career pivot window',
      ageWindow:
        age === null
          ? locale === 'ko'
            ? '24-29ì„¸'
            : 'ages 24-29'
          : formatAgeWindow(Math.max(22, age - 8), Math.max(25, age - 3), locale),
      status: 'conditional',
      summary:
        locale === 'ko'
          ? `${actionState?.label || localizeDomain(core.canonical.actionFocusDomain, locale)} ì¶•ì—ì„œ ì—­í• , ê´€ê³„, ì±…ìž„ ë²”ìœ„ë¥¼ ë‹¤ì‹œ ê³ ë¥´ëŠ” ë¶„ê¸°ì˜€ì„ ê°€ëŠ¥ì„±ì´ í½ë‹ˆë‹¤.`
          : `This was likely a branching period for role, relationship, or responsibility selection on the ${actionState?.label || localizeDomain(core.canonical.actionFocusDomain, locale)} axis.`,
      evidence: uniq([
        ...(actionState?.supportSignals || []).slice(0, 2),
        ...(
          core.canonical.domainTimingWindows.find(
            (item) => item.domain === core.canonical.actionFocusDomain
          )?.entryConditions || []
        ).slice(0, 1),
      ]).filter(Boolean),
    },
    {
      key:
        rankRiskAxis(core) === 'health'
          ? 'health-reset'
          : rankRiskAxis(core) === 'relationship'
            ? 'relationship-lesson'
            : 'money-reset',
      label:
        rankRiskAxis(core) === 'health'
          ? locale === 'ko'
            ? 'íšŒë³µ ë¦¬ì…‹ êµ¬ê°„'
            : 'Health reset window'
          : rankRiskAxis(core) === 'relationship'
            ? locale === 'ko'
              ? 'ê´€ê³„ ê²½ê³„ ìž¬ì„¤ì • êµ¬ê°„'
              : 'Relationship boundary reset window'
            : locale === 'ko'
              ? 'ì†ì‹¤ ë°©ì§€ ìž¬ì •ë¹„ êµ¬ê°„'
              : 'Loss-control reset window',
      ageWindow:
        age === null
          ? locale === 'ko'
            ? 'ìµœê·¼ 1-3ë…„'
            : 'recent 1-3 years'
          : formatAgeWindow(Math.max(0, age - 3), age, locale),
      status: 'conditional',
      summary:
        locale === 'ko'
          ? `${riskState?.label || localizeDomain(rankRiskAxis(core), locale)} ì¶•ì—ì„œ ê³¼ë¶€í•˜ë¥¼ ì¤„ì´ê±°ë‚˜ ê²½ê³„ë¥¼ ë‹¤ì‹œ ì„¸ìš°ëŠ” ì‚¬ê±´ì´ ìžˆì—ˆì„ ê°€ëŠ¥ì„±ì´ í½ë‹ˆë‹¤.`
          : `There was likely a recent reset event on the ${riskState?.label || localizeDomain(rankRiskAxis(core), locale)} axis to reduce overload or re-establish boundaries.`,
      evidence: uniq([
        ...(riskState?.pressureSignals || []).slice(0, 2),
        ...(relationshipState?.pressureSignals || []).slice(
          0,
          rankRiskAxis(core) === 'relationship' ? 1 : 0
        ),
      ]).filter(Boolean),
    },
  ]

  return {
    summary:
      locale === 'ko'
        ? 'ê³¼ê±° ë³µì›ì€ í™•ì • ì‚¬ê±´í‘œê°€ ì•„ë‹ˆë¼ í˜„ìž¬ êµ¬ì¡°ë¥¼ ê°€ìž¥ ìž˜ ì„¤ëª…í•˜ëŠ” ì „í™˜ êµ¬ê°„ í›„ë³´ë¥¼ ì œì‹œí•˜ëŠ” ì¸µìž…ë‹ˆë‹¤.'
        : 'Past reconstruction is not a fixed event log but a set of likely pivot windows that best explain the current structure.',
    markers,
  }
}

export function buildUncertaintyEnvelope(
  core: DestinyCoreResult,
  locale: 'ko' | 'en',
  domainStateGraph: AdapterPersonDomainState[]
): AdapterPersonUncertaintyEnvelope {
  const reliableAreas = domainStateGraph
    .filter((item) => item.currentState === 'expansion' || item.currentState === 'stable')
    .map((item) => item.label)
    .slice(0, 3)
  const conditionalAreas = domainStateGraph
    .filter((item) => item.currentState === 'mixed' || item.currentState === 'defensive')
    .map((item) => item.label)
    .slice(0, 3)
  const unresolvedAreas = uniq(
    [
      ...core.quality.dataQuality.missingFields.map((item) =>
        locale === 'ko' ? `${item} ìž…ë ¥ ëˆ„ë½` : `Missing ${item}`
      ),
      ...core.canonical.coherenceAudit.contradictionFlags,
    ].filter(Boolean)
  ).slice(0, 4)

  return {
    summary:
      locale === 'ko'
        ? 'ê°•í•˜ê²Œ ì½ížˆëŠ” ì˜ì—­ê³¼ ì¡°ê±´ë¶€ë¡œë§Œ ì½ì–´ì•¼ í•˜ëŠ” ì˜ì—­ì„ ë¶„ë¦¬í•´ í•´ì„í•´ì•¼ ì˜¤ì°¨ê°€ ì¤„ì–´ë“­ë‹ˆë‹¤.'
        : 'Variance drops when clearly reliable areas are separated from conditional ones.',
    reliableAreas,
    conditionalAreas,
    unresolvedAreas,
  }
}

export function buildEvidenceLedger(core: DestinyCoreResult) {
  return {
    topClaimIds: core.canonical.claimIds.slice(0, 8),
    topSignalIds: core.canonical.topSignalIds.slice(0, 8),
    topPatternIds: core.canonical.topPatterns.map((item) => item.id).slice(0, 6),
    topScenarioIds: core.canonical.topScenarios.map((item) => item.id).slice(0, 6),
    topDecisionId: core.canonical.topDecision?.id || null,
    topDecisionLabel: core.canonical.topDecision?.label || null,
    coherenceNotes: core.canonical.coherenceAudit.notes.slice(0, 6),
    contradictionFlags: core.canonical.coherenceAudit.contradictionFlags.slice(0, 6),
  }
}
