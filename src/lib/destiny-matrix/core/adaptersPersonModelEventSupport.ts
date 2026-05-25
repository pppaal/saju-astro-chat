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
            ? `${portrait.label} 축은 ${timescale} 구간에서 ${status === 'open' ? '열림' : status === 'blocked' ? '방어' : '혼합'} 상태로 읽힙니다.`
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
          ? '이 구조는 강한 자극식보다 소화 부담이 낮고 리듬이 일정한 식사가 더 안정적으로 맞습니다.'
          : 'This profile responds better to low-load, rhythm-consistent meals than to high-stimulus eating.',
      thermalBias:
        healthState?.currentState === 'defensive' || healthState?.currentState === 'blocked'
          ? locale === 'ko'
            ? '따뜻하고 안정적인 식사 쪽'
            : 'Toward warm and steady meals'
          : locale === 'ko'
            ? '중간 온도의 균형 식사 쪽'
            : 'Toward balanced-temperature meals',
      digestionStyle:
        locale === 'ko'
          ? '공복 후 과식보다 작은 식사 간격 유지가 유리합니다.'
          : 'Smaller meal spacing works better than fasting followed by heavy intake.',
      helpfulFoods:
        locale === 'ko'
          ? ['국물형 식사', '단백질과 곡물을 같이 둔 규칙식', '낮 시간대 수분 보충']
          : ['Broth-based meals', 'Protein-and-grain regular meals', 'Daytime hydration'],
      cautionFoods:
        locale === 'ko'
          ? ['야식과 공복 후 폭식', '카페인으로 버티는 식사', '당분 급상승 간식']
          : ['Late-night heavy meals', 'Caffeine-driven meal skipping', 'Sugar-spike snacking'],
      rhythmGuidance:
        locale === 'ko'
          ? [
              '첫 집중 블록 전에 가벼운 연료를 먼저 넣으세요.',
              '저녁에는 자극식보다 회복식으로 마무리하세요.',
            ]
          : [
              'Fuel before the first focus block.',
              'End the evening with recovery meals rather than stimulation.',
            ],
    },
    lifeRhythmProfile: {
      summary:
        locale === 'ko'
          ? '이 사람은 몰입 블록과 회복 블록을 의도적으로 분리할수록 성과가 선명해집니다.'
          : 'This person performs better when deep-focus blocks and recovery blocks are separated on purpose.',
      peakWindows: buildPeakWindows(birthHour, locale),
      recoveryWindows: buildRecoveryWindows(birthHour, locale),
      stressBehaviors:
        topPressure.length > 0
          ? topPressure
          : locale === 'ko'
            ? ['과한 검토로 실행이 늦어짐', '자극이 많아질수록 회복이 뒤로 밀림']
            : ['Over-review delays execution', 'Recovery gets pushed back as stimulation rises'],
      regulationMoves:
        locale === 'ko'
          ? ['하루에 결정 블록을 두 번 이상 열지 마세요.', '실행 전 10분 정리 루틴을 고정하세요.']
          : [
              'Do not open more than two decision blocks a day.',
              'Lock a 10-minute reset routine before execution.',
            ],
    },
    relationshipStyleProfile: {
      summary:
        relationshipState?.thesis ||
        (locale === 'ko'
          ? '관계는 감정보다 조건과 리듬이 맞을 때 더 안정적으로 유지됩니다.'
          : 'Relationships stabilize when conditions and rhythm fit, not just emotion.'),
      attractionPatterns: relationshipState?.supportSignals.slice(0, 4) || [],
      stabilizers:
        locale === 'ko'
          ? ['관계 기대치를 말로 먼저 맞추기', '속도보다 책임 범위부터 합의하기']
          : ['Align expectations in words first', 'Agree on responsibility before pace'],
      ruptureTriggers: relationshipState?.pressureSignals.slice(0, 4) || [],
      repairMoves:
        locale === 'ko'
          ? [
              '침묵으로 버티지 말고 체크인 간격을 정하세요.',
              '문제보다 역할과 경계를 먼저 다시 정리하세요.',
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
          ? '성과는 감각보다 구조와 기준을 먼저 세울 때 더 잘 납니다.'
          : 'Performance improves when structure and criteria are set before speed.'),
      bestRoles: careerState?.supportSignals.slice(0, 4) || [],
      bestConditions:
        locale === 'ko'
          ? ['역할 범위가 문서화된 환경', '중간 점검이 가능한 단계형 업무']
          : ['Documented role scope', 'Step-based work with review checkpoints'],
      fatigueTriggers: careerState?.pressureSignals.slice(0, 4) || [],
      leverageMoves:
        locale === 'ko'
          ? ['결정 전에 기준표를 먼저 만들기', '한 번에 큰 점프보다 단계형 승부로 가기']
          : [
              'Build the criteria sheet before deciding',
              'Choose staged leverage over one large jump',
            ],
    },
    moneyStyleProfile: {
      summary:
        wealthState?.thesis ||
        (locale === 'ko'
          ? '돈은 한 번의 승부보다 누적 구조와 새는 지점 관리에서 더 잘 붙습니다.'
          : 'Money grows better through cumulative structure and leakage control than through one big swing.'),
      earningPattern: wealthState?.supportSignals.slice(0, 4) || topSupport.slice(0, 4),
      savingPattern:
        locale === 'ko'
          ? ['자동 이체처럼 반복 구조 만들기', '성과금보다 고정 흐름 먼저 안정화하기']
          : ['Create repeatable transfer structures', 'Stabilize fixed flow before bonus chasing'],
      leakageRisks: wealthState?.pressureSignals.slice(0, 4) || [],
      controlRules:
        locale === 'ko'
          ? ['큰 결제는 하루 재확인 후 진행하기', '기분 소비와 업무 소비를 분리하기']
          : ['Recheck large spending after one day', 'Separate mood spending from work spending'],
    },
    environmentProfile: {
      summary:
        locale === 'ko'
          ? '환경은 화려함보다 소음과 자극을 조절할 수 있을 때 더 잘 맞습니다.'
          : 'Environment fits better when noise and stimulation are controllable rather than flashy.',
      preferredSettings:
        locale === 'ko'
          ? ['혼자 정리할 수 있는 닫힌 공간', '빛과 소음을 조절할 수 있는 작업 환경']
          : ['Closed space for solo consolidation', 'Work setting with light/noise control'],
      drainSignals: topPressure.slice(0, 4),
      resetActions:
        locale === 'ko'
          ? [
              '시야에 남는 할 일을 세 개 이하로 줄이기',
              '밤에는 화면 자극을 줄이고 회복 루틴으로 전환하기',
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
      label: locale === 'ko' ? '취업/포지션 진입' : 'Career Entry',
      domain: 'career',
    },
    {
      key: 'partnerEntry',
      label: locale === 'ko' ? '관계 유입' : 'Partner Entry',
      domain: 'relationship',
    },
    {
      key: 'commitment',
      label: locale === 'ko' ? '관계 확정/결혼' : 'Commitment',
      domain: 'relationship',
    },
    {
      key: 'moneyBuild',
      label: locale === 'ko' ? '돈 흐름 구축' : 'Money Build',
      domain: 'wealth',
    },
    {
      key: 'healthReset',
      label: locale === 'ko' ? '회복/건강 리셋' : 'Health Reset',
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
            ? `${eventDef.label} 사건은 ${localizeDomain(eventDef.domain, locale)} 축 조건이 맞을 때 열립니다.`
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
              ? `${item.birthTime} 생시는 재평가 후보로 유지됩니다.`
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
          ? `${formatBirthTimeCandidate(hour)} 전후로 읽으면 ${actionState?.label || '핵심 축'} 실행 리듬과 ${riskState?.label || '리스크 축'} 회복 리듬이 ${fitScore >= 0.72 ? '비교적 잘 맞습니다' : fitScore >= 0.58 ? '부분적으로 맞습니다' : '민감하게 흔들립니다'}.`
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
        ? `${state.label} 구조는 ${state.firstMove} 쪽이 먼저 맞습니다.`
        : `The structural read on ${state.label} points first toward ${state.firstMove}.`
    const astroView =
      locale === 'ko'
        ? `${state.label} 촉발은 ${state.nextShift || strongest?.timescale || '현재'} 구간에서 더 선명해집니다.`
        : `The timing trigger on ${state.label} becomes clearer in the ${state.nextShift || strongest?.timescale || 'current'} window.`
    const summary =
      locale === 'ko'
        ? status === 'aligned'
          ? `${state.label} 축은 사주 구조와 점성 타이밍이 대체로 같은 방향을 가리킵니다.`
          : status === 'saju-leading'
            ? `${state.label} 축은 구조 지지는 먼저 형성됐지만 점성 트리거는 약간 늦게 붙습니다.`
            : status === 'astro-leading'
              ? `${state.label} 축은 점성 촉발이 먼저 앞서고 구조적 수용은 뒤따릅니다.`
              : `${state.label} 축은 구조와 타이밍이 같은 속도로 움직이지 않아 해석 긴장이 큽니다.`
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
      label: locale === 'ko' ? '정체성 재정렬 구간' : 'Identity reset window',
      ageWindow:
        age === null
          ? locale === 'ko'
            ? '18-22세'
            : 'ages 18-22'
          : formatAgeWindow(Math.max(16, age - 12), Math.max(20, age - 8), locale),
      status: core.normalizedInput.profileContext?.birthDate ? 'anchored' : 'conditional',
      summary:
        locale === 'ko'
          ? `${core.canonical.focusDomain === core.canonical.actionFocusDomain ? actionState?.label || '핵심 축' : localizeDomain(core.canonical.focusDomain, locale)} 패턴이 이 시기부터 생활 습관으로 굳었을 가능성이 큽니다.`
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
            ? '관계 학습 구간'
            : 'Relationship lesson window'
          : core.canonical.actionFocusDomain === 'wealth'
            ? locale === 'ko'
              ? '재정 재배열 구간'
              : 'Money reset window'
            : locale === 'ko'
              ? '커리어 방향 전환 구간'
              : 'Career pivot window',
      ageWindow:
        age === null
          ? locale === 'ko'
            ? '24-29세'
            : 'ages 24-29'
          : formatAgeWindow(Math.max(22, age - 8), Math.max(25, age - 3), locale),
      status: 'conditional',
      summary:
        locale === 'ko'
          ? `${actionState?.label || localizeDomain(core.canonical.actionFocusDomain, locale)} 축에서 역할, 관계, 책임 범위를 다시 고르는 분기였을 가능성이 큽니다.`
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
            ? '회복 리셋 구간'
            : 'Health reset window'
          : rankRiskAxis(core) === 'relationship'
            ? locale === 'ko'
              ? '관계 경계 재설정 구간'
              : 'Relationship boundary reset window'
            : locale === 'ko'
              ? '손실 방지 재정비 구간'
              : 'Loss-control reset window',
      ageWindow:
        age === null
          ? locale === 'ko'
            ? '최근 1-3년'
            : 'recent 1-3 years'
          : formatAgeWindow(Math.max(0, age - 3), age, locale),
      status: 'conditional',
      summary:
        locale === 'ko'
          ? `${riskState?.label || localizeDomain(rankRiskAxis(core), locale)} 축에서 과부하를 줄이거나 경계를 다시 세우는 사건이 있었을 가능성이 큽니다.`
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
        ? '과거 복원은 확정 사건표가 아니라 현재 구조를 가장 잘 설명하는 전환 구간 후보를 제시하는 층입니다.'
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
        locale === 'ko' ? `${item} 입력 누락` : `Missing ${item}`
      ),
      ...core.canonical.coherenceAudit.contradictionFlags,
    ].filter(Boolean)
  ).slice(0, 4)

  return {
    summary:
      locale === 'ko'
        ? '강하게 읽히는 영역과 조건부로만 읽어야 하는 영역을 분리해 해석해야 오차가 줄어듭니다.'
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
