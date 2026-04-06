import type { SignalDomain } from './signalSynthesizer'
import type { DestinyCoreResult } from './runDestinyCore'
import type {
  AdapterBirthTimeHypothesis,
  AdapterCrossConflictItem,
  AdapterPersonAppliedProfile,
  AdapterPersonDimension,
  AdapterPersonDomainState,
  AdapterPersonEventOutlook,
  AdapterPersonFutureBranch,
  AdapterPersonLayer,
  AdapterPersonModel,
  AdapterPastEventMarker,
  AdapterPersonState,
  AdapterPersonUncertaintyEnvelope,
} from './adaptersTypes'
import {
  buildBranchSet,
  buildLatentTopAxes,
  buildSingleUserModel,
  getAllowedActionLabels,
  getBlockedActionLabels,
  getTopDecisionLabel,
  localizeDomain,
  rankRiskAxis,
} from './adaptersPresentation'

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function round2(value: number): number {
  return Math.round(clamp01(value) * 100) / 100
}

function avg(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value))
  if (!valid.length) return 0
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function summarizeWindow(window: string | undefined, locale: 'ko' | 'en'): string {
  const value = String(window || '').trim()
  if (value) return value
  return locale === 'ko' ? '현재' : 'current'
}

function getModePressureScore(mode: 'execute' | 'verify' | 'prepare'): number {
  if (mode === 'prepare') return 0.78
  if (mode === 'verify') return 0.56
  return 0.28
}

function getModeSupportScore(mode: 'execute' | 'verify' | 'prepare'): number {
  if (mode === 'execute') return 0.78
  if (mode === 'verify') return 0.56
  return 0.4
}

function getModeLabel(mode: 'execute' | 'verify' | 'prepare', locale: 'ko' | 'en'): string {
  if (locale !== 'ko') return mode
  if (mode === 'execute') return '실행 우위'
  if (mode === 'verify') return '검토 우위'
  return '준비 우위'
}

function buildDimensionScores(
  core: DestinyCoreResult,
  domain: SignalDomain
): {
  structuralScore: number
  activationScore: number
  pressureScore: number
  supportScore: number
  agreementScore: number
  contradictionScore: number
} {
  const verdict = core.canonical.domainVerdicts.find((item) => item.domain === domain)
  const timing = core.canonical.domainTimingWindows.find((item) => item.domain === domain)
  const manifestation = core.canonical.manifestations.find((item) => item.domain === domain)
  const crossRow = (core.canonical.crossAgreementMatrix || []).find(
    (item) => item.domain === domain
  )
  const agreementScore = avg(
    Object.values(crossRow?.timescales || {}).map((cell) => cell.agreement || 0)
  )
  const contradictionScore = avg(
    Object.values(crossRow?.timescales || {}).map((cell) => cell.contradiction || 0)
  )

  return {
    structuralScore: round2(verdict?.confidence || 0),
    activationScore: round2(
      avg([timing?.readinessScore || 0, timing?.triggerScore || 0, timing?.convergenceScore || 0])
    ),
    pressureScore: round2(
      avg([
        getModePressureScore(verdict?.mode || 'verify'),
        contradictionScore,
        Math.min((manifestation?.riskExpressions?.length || 0) * 0.14, 1),
      ])
    ),
    supportScore: round2(
      avg([
        getModeSupportScore(verdict?.mode || 'verify'),
        agreementScore,
        Math.min((verdict?.allowedActions?.length || 0) * 0.18, 1),
      ])
    ),
    agreementScore: round2(agreementScore),
    contradictionScore: round2(contradictionScore),
  }
}

function mapDomainState(
  mode: 'execute' | 'verify' | 'prepare',
  supportScore: number,
  pressureScore: number
): AdapterPersonDomainState['currentState'] {
  if (mode === 'execute' && supportScore >= 0.58 && pressureScore < 0.52) return 'expansion'
  if (mode === 'prepare' && pressureScore >= 0.6) return 'defensive'
  if (pressureScore >= 0.66 && supportScore < 0.46) return 'blocked'
  if (mode === 'verify' || Math.abs(supportScore - pressureScore) <= 0.16) return 'mixed'
  return 'stable'
}

function mapTimingStatus(agreement: number, contradiction: number): 'open' | 'mixed' | 'blocked' {
  if (agreement >= Math.max(0.58, contradiction + 0.14)) return 'open'
  if (contradiction >= Math.max(0.52, agreement + 0.14)) return 'blocked'
  return 'mixed'
}

function domainBySignalLabel(label: string): SignalDomain | null {
  const normalized = String(label || '').toLowerCase()
  if (normalized.includes('career') || normalized.includes('work') || normalized.includes('job')) {
    return 'career'
  }
  if (
    normalized.includes('relationship') ||
    normalized.includes('partner') ||
    normalized.includes('marriage') ||
    normalized.includes('love')
  ) {
    return 'relationship'
  }
  if (
    normalized.includes('wealth') ||
    normalized.includes('money') ||
    normalized.includes('finance')
  ) {
    return 'wealth'
  }
  if (
    normalized.includes('health') ||
    normalized.includes('body') ||
    normalized.includes('recovery') ||
    normalized.includes('stress')
  ) {
    return 'health'
  }
  return null
}

function pickLeadDomains(core: DestinyCoreResult): SignalDomain[] {
  return core.canonical.domainVerdicts
    .slice()
    .sort((left, right) => {
      const leftTiming =
        core.canonical.domainTimingWindows.find((item) => item.domain === left.domain)
          ?.timingRelevance || 0
      const rightTiming =
        core.canonical.domainTimingWindows.find((item) => item.domain === right.domain)
          ?.timingRelevance || 0
      return right.confidence + rightTiming - (left.confidence + leftTiming)
    })
    .map((item) => item.domain)
    .filter((domain, index, list) => list.indexOf(domain) === index)
    .slice(0, 4)
}

function buildDimensionSummary(params: {
  domainLabel: string
  mode: 'execute' | 'verify' | 'prepare'
  window?: string
  manifestation?: string
  locale: 'ko' | 'en'
}): string {
  const modeLabel = getModeLabel(params.mode, params.locale)
  const windowLabel = summarizeWindow(params.window, params.locale)
  const manifestation = String(params.manifestation || '').trim()

  if (params.locale === 'ko') {
    return manifestation
      ? `${params.domainLabel} 축은 ${modeLabel} 상태이며 ${windowLabel} 구간에서 가장 강하게 발현됩니다. ${manifestation}`
      : `${params.domainLabel} 축은 ${modeLabel} 상태이며 ${windowLabel} 구간에서 가장 강하게 발현됩니다.`
  }

  return manifestation
    ? `${params.domainLabel} stays in ${modeLabel} mode and expresses most clearly in the ${windowLabel} window. ${manifestation}`
    : `${params.domainLabel} stays in ${modeLabel} mode and expresses most clearly in the ${windowLabel} window.`
}

function buildPersonDimensions(
  core: DestinyCoreResult,
  locale: 'ko' | 'en'
): AdapterPersonDimension[] {
  return pickLeadDomains(core).map((domain) => {
    const verdict = core.canonical.domainVerdicts.find((item) => item.domain === domain)
    const timing = core.canonical.domainTimingWindows.find((item) => item.domain === domain)
    const manifestation = core.canonical.manifestations.find((item) => item.domain === domain)
    const scores = buildDimensionScores(core, domain)

    return {
      domain,
      label: localizeDomain(domain, locale),
      structuralScore: scores.structuralScore,
      activationScore: scores.activationScore,
      pressureScore: scores.pressureScore,
      supportScore: scores.supportScore,
      timingWindow: timing?.window,
      summary: buildDimensionSummary({
        domainLabel: localizeDomain(domain, locale),
        mode: verdict?.mode || 'verify',
        window: timing?.window,
        manifestation: manifestation?.manifestation,
        locale,
      }),
    }
  })
}

function buildPersonLayers(core: DestinyCoreResult, locale: 'ko' | 'en'): AdapterPersonLayer[] {
  const singleUserModel = buildSingleUserModel(core, locale)
  const structureFacet = singleUserModel.facets.find((facet) => facet.key === 'structure')
  const cycleFacet = singleUserModel.facets.find((facet) => facet.key === 'cycle')
  const triggerFacet = singleUserModel.facets.find((facet) => facet.key === 'trigger')
  const riskFacet = singleUserModel.facets.find((facet) => facet.key === 'risk')
  const topBranch = buildBranchSet(core, locale)[0]
  const topPatternFamilies = core.canonical.topPatterns
    .slice(0, 3)
    .map((item) => String(item.family || item.id || '').trim())
    .filter(Boolean)

  return [
    {
      key: 'foundation',
      label: locale === 'ko' ? '타고난 구조' : 'Foundation',
      summary: structureFacet?.summary || core.canonical.thesis,
      bullets: (structureFacet?.details || []).slice(0, 4),
    },
    {
      key: 'formation',
      label: locale === 'ko' ? '형성된 패턴' : 'Formation',
      summary:
        locale === 'ko'
          ? topPatternFamilies.length
            ? `반복적으로 굳은 패턴 축은 ${topPatternFamilies.join(', ')}입니다.`
            : '반복 패턴은 구조축과 타이밍축의 결합으로 형성됩니다.'
          : topPatternFamilies.length
            ? `The repeated pattern families are ${topPatternFamilies.join(', ')}.`
            : 'Repeated patterns are formed by the structure and timing stack.',
      bullets: [
        ...(cycleFacet?.details || []).slice(0, 2),
        ...(riskFacet?.details || []).slice(0, 2),
      ].slice(0, 4),
    },
    {
      key: 'active',
      label: locale === 'ko' ? '현재 활성 상태' : 'Active State',
      summary: triggerFacet?.summary || cycleFacet?.summary || core.canonical.primaryAction,
      bullets: [
        ...(triggerFacet?.details || []).slice(0, 2),
        ...(cycleFacet?.details || []).slice(0, 2),
      ].slice(0, 4),
    },
    {
      key: 'future',
      label: locale === 'ko' ? '미래 분기' : 'Future Branches',
      summary:
        topBranch?.summary ||
        (locale === 'ko'
          ? '앞으로의 분기는 상위 시나리오와 타이밍 창에서 갈립니다.'
          : 'The future branch is decided by the top scenario stack and timing window.'),
      bullets: [
        ...(topBranch?.entry || []).slice(0, 2),
        ...(topBranch?.abort || []).slice(0, 2),
      ].slice(0, 4),
    },
  ]
}

function buildStateSummary(params: {
  kind: AdapterPersonState['key']
  focusLabel: string
  actionLabel: string
  riskLabel: string
  topDecisionLabel: string
  branchSummary?: string
  locale: 'ko' | 'en'
}): string {
  if (params.locale === 'ko') {
    if (params.kind === 'baseline') {
      return `${params.focusLabel}이 기본 자아의 배경축이고 ${params.actionLabel}이 실제 행동축으로 올라오는 사람입니다.`
    }
    if (params.kind === 'pressure') {
      return `압박이 걸리면 ${params.riskLabel} 축이 먼저 예민해지고 판단은 더 보수적으로 수렴합니다.`
    }
    return `${params.topDecisionLabel} 쪽이 기회 상태에서 먼저 열리며, ${params.branchSummary || `${params.actionLabel} 축에서 상위 분기가 열립니다.`}`
  }

  if (params.kind === 'baseline') {
    return `${params.focusLabel} is the baseline identity axis, while ${params.actionLabel} becomes the live action axis.`
  }
  if (params.kind === 'pressure') {
    return `Under pressure, the ${params.riskLabel} axis becomes sensitive first and decisions narrow into a more defensive posture.`
  }
  return `${params.topDecisionLabel} opens first in opportunity mode, and ${params.branchSummary || `the top branch opens on the ${params.actionLabel} axis.`}`
}

function buildPersonStates(core: DestinyCoreResult, locale: 'ko' | 'en'): AdapterPersonState[] {
  const focusLabel = localizeDomain(core.canonical.focusDomain, locale)
  const actionLabel = localizeDomain(core.canonical.actionFocusDomain, locale)
  const riskDomain = rankRiskAxis(core)
  const riskLabel = localizeDomain(riskDomain, locale)
  const topDecisionLabel = getTopDecisionLabel(core, locale) || core.canonical.primaryAction
  const topBranch = buildBranchSet(core, locale)[0]
  const latentAxes = buildLatentTopAxes(core, locale)

  return [
    {
      key: 'baseline',
      label: locale === 'ko' ? '기본 상태' : 'Baseline',
      summary: buildStateSummary({
        kind: 'baseline',
        focusLabel,
        actionLabel,
        riskLabel,
        topDecisionLabel,
        locale,
      }),
      drivers: latentAxes
        .filter((axis) => axis.group === 'structural')
        .slice(0, 3)
        .map((axis) => axis.label),
      counterweights: getBlockedActionLabels(
        core.canonical.judgmentPolicy.blockedActions,
        locale
      ).slice(0, 2),
      domains: [core.canonical.focusDomain, core.canonical.actionFocusDomain],
    },
    {
      key: 'pressure',
      label: locale === 'ko' ? '압박 상태' : 'Pressure',
      summary: buildStateSummary({
        kind: 'pressure',
        focusLabel,
        actionLabel,
        riskLabel,
        topDecisionLabel,
        locale,
      }),
      drivers: latentAxes
        .filter((axis) => axis.group === 'conflict')
        .slice(0, 3)
        .map((axis) => axis.label),
      counterweights: [
        ...core.canonical.judgmentPolicy.hardStops.slice(0, 2),
        ...core.canonical.judgmentPolicy.softChecks.slice(0, 2),
      ].slice(0, 3),
      domains: [riskDomain, core.canonical.actionFocusDomain],
    },
    {
      key: 'opportunity',
      label: locale === 'ko' ? '기회 상태' : 'Opportunity',
      summary: buildStateSummary({
        kind: 'opportunity',
        focusLabel,
        actionLabel,
        riskLabel,
        topDecisionLabel,
        branchSummary: topBranch?.summary,
        locale,
      }),
      drivers: [
        ...latentAxes
          .filter((axis) => axis.group === 'timing')
          .slice(0, 2)
          .map((axis) => axis.label),
        ...getAllowedActionLabels(core.canonical.judgmentPolicy.allowedActions, locale).slice(0, 2),
      ].slice(0, 4),
      counterweights: (topBranch?.abort || []).slice(0, 2),
      domains: [core.canonical.actionFocusDomain, core.canonical.focusDomain],
    },
  ]
}

function buildFutureBranches(
  core: DestinyCoreResult,
  locale: 'ko' | 'en'
): AdapterPersonFutureBranch[] {
  return buildBranchSet(core, locale)
    .slice(0, 3)
    .map((branch) => {
      const scenario = core.canonical.topScenarios.find((item) => item.id === branch.id)
      return {
        id: branch.id,
        label: branch.label,
        domain: branch.domain,
        window: branch.window,
        probability: round2(scenario?.probability || 0),
        summary: branch.summary,
        conditions: [
          ...(branch.entry || []).slice(0, 2),
          ...(branch.sustain || []).slice(0, 1),
        ].slice(0, 3),
        blockers: branch.abort.slice(0, 2),
      }
    })
}

function buildFormationProfile(core: DestinyCoreResult, locale: 'ko' | 'en') {
  const repeatedPatternFamilies = uniq(
    core.canonical.topPatterns
      .slice(0, 4)
      .map((item) => String(item.family || item.id || '').trim())
      .filter(Boolean)
  )
  const dominantLatentGroups = uniq(
    buildLatentTopAxes(core, locale)
      .slice(0, 4)
      .map((axis) => axis.group)
      .filter(Boolean)
  )
  const pressureHabits = uniq(
    core.canonical.manifestations
      .flatMap((item) => item.riskExpressions || [])
      .slice(0, 4)
      .filter(Boolean)
  )
  const supportHabits = uniq(
    core.canonical.manifestations
      .flatMap((item) => item.likelyExpressions || [])
      .slice(0, 4)
      .filter(Boolean)
  )

  return {
    summary:
      locale === 'ko'
        ? repeatedPatternFamilies.length
          ? `이 사람은 ${repeatedPatternFamilies.join(', ')} 계열 패턴이 반복되며 성향이 굳어집니다.`
          : '이 사람은 반복되는 구조 패턴과 타이밍 패턴이 행동 습관을 만든 상태입니다.'
        : repeatedPatternFamilies.length
          ? `This person tends to consolidate around ${repeatedPatternFamilies.join(', ')} pattern families.`
          : 'This person is shaped by repeated structure and timing patterns.',
    repeatedPatternFamilies,
    dominantLatentGroups,
    pressureHabits,
    supportHabits,
  }
}

function buildTimeProfile(core: DestinyCoreResult, locale: 'ko' | 'en') {
  const windows = core.canonical.domainTimingWindows.slice(0, 4).map((item) => ({
    domain: item.domain,
    label: localizeDomain(item.domain, locale),
    window: summarizeWindow(item.window, locale),
    granularity: String(item.timingGranularity || ''),
    confidence: round2(item.confidence || 0),
    whyNow: item.whyNow,
    entryConditions: (item.entryConditions || []).slice(0, 3),
    abortConditions: (item.abortConditions || []).slice(0, 3),
  }))
  const activationSources = core.canonical.manifestations
    .slice(0, 4)
    .flatMap((item) =>
      (item.activationSources || []).slice(0, 3).map((source) => ({
        domain: item.domain,
        source: source.source,
        label: source.label,
        intensity: round2(source.intensity || 0),
        active: Boolean(source.active),
      }))
    )
    .slice(0, 8)
  const topTiming =
    core.canonical.domainTimingWindows.find(
      (item) => item.domain === core.canonical.actionFocusDomain
    ) || core.canonical.domainTimingWindows[0]

  return {
    currentWindow: topTiming?.window,
    currentGranularity: topTiming?.timingGranularity,
    timingNarrative:
      topTiming?.timingConflictNarrative ||
      (locale === 'ko'
        ? '현재 타이밍은 구조와 촉발 신호를 함께 읽어야 합니다.'
        : 'Current timing should be read through structure and trigger together.'),
    confidence: round2(core.canonical.confidence || 0),
    windows,
    activationSources,
  }
}

function buildDomainPortraits(core: DestinyCoreResult, locale: 'ko' | 'en') {
  return pickLeadDomains(core).map((domain) => {
    const verdict = core.canonical.domainVerdicts.find((item) => item.domain === domain)
    const timing = core.canonical.domainTimingWindows.find((item) => item.domain === domain)
    const manifestation = core.canonical.manifestations.find((item) => item.domain === domain)
    const scores = buildDimensionScores(core, domain)

    return {
      domain,
      label: localizeDomain(domain, locale),
      mode: verdict?.mode || 'verify',
      structuralScore: scores.structuralScore,
      activationScore: scores.activationScore,
      pressureScore: scores.pressureScore,
      supportScore: scores.supportScore,
      timingWindow: timing?.window,
      summary: buildDimensionSummary({
        domainLabel: localizeDomain(domain, locale),
        mode: verdict?.mode || 'verify',
        window: timing?.window,
        manifestation: manifestation?.manifestation,
        locale,
      }),
      baselineThesis: manifestation?.baselineThesis || '',
      activationThesis: manifestation?.activationThesis || '',
      likelyExpressions: (manifestation?.likelyExpressions || []).slice(0, 4),
      riskExpressions: (manifestation?.riskExpressions || []).slice(0, 4),
      allowedActions: getAllowedActionLabels(verdict?.allowedActions || [], locale).slice(0, 3),
      blockedActions: getBlockedActionLabels(verdict?.blockedActions || [], locale).slice(0, 3),
    }
  })
}

function buildRelationshipProfile(core: DestinyCoreResult, locale: 'ko' | 'en') {
  const relationshipPortrait = buildDomainPortraits(core, locale).find(
    (item) => item.domain === 'relationship'
  )
  const relationshipManifestation = core.canonical.manifestations.find(
    (item) => item.domain === 'relationship'
  )
  const relationshipBranch = buildFutureBranches(core, locale).find(
    (item) => item.domain === 'relationship'
  )

  return {
    summary:
      relationshipPortrait?.summary ||
      (locale === 'ko'
        ? '관계 축은 현재 구조와 타이밍을 함께 봐야 읽히는 상태입니다.'
        : 'The relationship axis currently needs to be read through structure and timing together.'),
    partnerArchetypes: (relationshipManifestation?.likelyExpressions || []).slice(0, 4),
    inflowPaths: relationshipBranch?.conditions || [],
    commitmentConditions: relationshipPortrait?.allowedActions || [],
    breakPatterns: [
      ...(relationshipManifestation?.riskExpressions || []).slice(0, 3),
      ...(relationshipBranch?.blockers || []).slice(0, 2),
    ].slice(0, 4),
  }
}

function buildCareerProfile(core: DestinyCoreResult, locale: 'ko' | 'en') {
  const careerPortrait = buildDomainPortraits(core, locale).find((item) => item.domain === 'career')
  const careerManifestation = core.canonical.manifestations.find((item) => item.domain === 'career')
  const careerBranch = buildFutureBranches(core, locale).find((item) => item.domain === 'career')

  return {
    summary:
      careerPortrait?.summary ||
      (locale === 'ko'
        ? '커리어 축은 현재 구조와 타이밍이 함께 움직이는 상태입니다.'
        : 'The career axis currently moves through structure and timing together.'),
    suitableLanes: (careerManifestation?.likelyExpressions || []).slice(0, 4),
    executionStyle: [careerPortrait?.baselineThesis || '', careerPortrait?.activationThesis || '']
      .filter(Boolean)
      .slice(0, 3),
    hiringTriggers: careerBranch?.conditions || [],
    blockers: [
      ...(careerPortrait?.blockedActions || []).slice(0, 2),
      ...(careerBranch?.blockers || []).slice(0, 2),
    ].slice(0, 4),
  }
}

function parseBirthHour(raw: string | undefined): number | null {
  const value = String(raw || '').trim()
  const match = value.match(/^(\d{1,2})[:.]?(\d{2})?/)
  if (!match) return null
  const hour = Number(match[1])
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null
  return hour
}

function normalizeHour(hour: number): number {
  const normalized = hour % 24
  return normalized < 0 ? normalized + 24 : normalized
}

function hourToBucket(hour: number): AdapterBirthTimeHypothesis['bucket'] {
  if (hour < 6) return 'night'
  if (hour < 9) return 'early-morning'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

function formatBirthTimeCandidate(hour: number): string {
  return `${String(normalizeHour(hour)).padStart(2, '0')}:00`
}

function getBirthBucketLabel(
  bucket: AdapterBirthTimeHypothesis['bucket'],
  locale: 'ko' | 'en'
): string {
  const labels = {
    ko: {
      'early-morning': '이른 오전 가설',
      morning: '오전 가설',
      afternoon: '오후 가설',
      evening: '저녁 가설',
      night: '야간 가설',
    },
    en: {
      'early-morning': 'Early-morning hypothesis',
      morning: 'Morning hypothesis',
      afternoon: 'Afternoon hypothesis',
      evening: 'Evening hypothesis',
      night: 'Night hypothesis',
    },
  } as const
  return labels[locale][bucket]
}

function getCandidateActionFit(
  bucket: AdapterBirthTimeHypothesis['bucket'],
  state: AdapterPersonDomainState['currentState'] | undefined
): number {
  const table: Record<
    NonNullable<AdapterPersonDomainState['currentState']>,
    Record<AdapterBirthTimeHypothesis['bucket'], number>
  > = {
    expansion: {
      'early-morning': 0.86,
      morning: 0.8,
      afternoon: 0.66,
      evening: 0.48,
      night: 0.34,
    },
    stable: {
      'early-morning': 0.64,
      morning: 0.74,
      afternoon: 0.72,
      evening: 0.58,
      night: 0.42,
    },
    mixed: {
      'early-morning': 0.54,
      morning: 0.66,
      afternoon: 0.7,
      evening: 0.62,
      night: 0.44,
    },
    defensive: {
      'early-morning': 0.4,
      morning: 0.5,
      afternoon: 0.58,
      evening: 0.74,
      night: 0.66,
    },
    blocked: {
      'early-morning': 0.34,
      morning: 0.42,
      afternoon: 0.54,
      evening: 0.72,
      night: 0.7,
    },
  }
  return table[state || 'mixed'][bucket]
}

function getCandidateRecoveryFit(
  bucket: AdapterBirthTimeHypothesis['bucket'],
  state: AdapterPersonDomainState['currentState'] | undefined
): number {
  const needsRecovery = state === 'defensive' || state === 'blocked'
  if (needsRecovery) {
    return {
      'early-morning': 0.38,
      morning: 0.46,
      afternoon: 0.58,
      evening: 0.78,
      night: 0.72,
    }[bucket]
  }
  return {
    'early-morning': 0.74,
    morning: 0.68,
    afternoon: 0.6,
    evening: 0.5,
    night: 0.4,
  }[bucket]
}

function calculateProfileAge(
  birthDate: string | undefined,
  currentDateIso: string | undefined
): number | null {
  if (!birthDate) return null
  const birth = new Date(`${birthDate}T00:00:00Z`)
  const current = new Date(`${(currentDateIso || new Date().toISOString()).slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(current.getTime())) return null
  let age = current.getUTCFullYear() - birth.getUTCFullYear()
  const birthMonth = birth.getUTCMonth()
  const currentMonth = current.getUTCMonth()
  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && current.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1
  }
  return age >= 0 ? age : null
}

function formatAgeWindow(startAge: number, endAge: number, locale: 'ko' | 'en'): string {
  const safeStart = Math.max(0, startAge)
  const safeEnd = Math.max(safeStart, endAge)
  return locale === 'ko' ? `${safeStart}-${safeEnd}세` : `ages ${safeStart}-${safeEnd}`
}

function buildPeakWindows(hour: number | null, locale: 'ko' | 'en'): string[] {
  if (hour === null) {
    return locale === 'ko'
      ? ['오전 집중 블록', '오후 점검 블록']
      : ['Morning focus block', 'Afternoon review block']
  }
  if (hour < 8) {
    return locale === 'ko'
      ? ['이른 오전 깊은 집중', '점심 전 결정 블록']
      : ['Early-morning deep focus', 'Pre-lunch decision block']
  }
  if (hour < 15) {
    return locale === 'ko'
      ? ['오전 중반 실행 블록', '늦은 오후 정리 블록']
      : ['Mid-morning execution block', 'Late-afternoon consolidation block']
  }
  return locale === 'ko'
    ? ['늦은 오후 실행 블록', '밤 전 조용한 정리 블록']
    : ['Late-afternoon execution block', 'Pre-night quiet consolidation block']
}

function buildRecoveryWindows(hour: number | null, locale: 'ko' | 'en'): string[] {
  if (hour !== null && hour < 8) {
    return locale === 'ko'
      ? ['오후 초반 짧은 회복', '밤 11시 이전 수면 진입']
      : ['Early-afternoon reset', 'Sleep entry before 11pm']
  }
  return locale === 'ko'
    ? ['저녁 자극 차단 구간', '밤 12시 이전 수면 진입']
    : ['Evening low-stimulus window', 'Sleep entry before midnight']
}

function mapCurrentStateToEventStatus(
  state: AdapterPersonDomainState['currentState']
): AdapterPersonEventOutlook['status'] {
  if (state === 'expansion' || state === 'stable') return 'open'
  if (state === 'blocked') return 'blocked'
  return 'mixed'
}

function buildDomainStateGraph(
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
          .map((source) => source.label),
        ...portrait.likelyExpressions,
        ...portrait.allowedActions,
      ].filter(Boolean)
    ).slice(0, 4)
    const pressureSignals = uniq(
      [...portrait.riskExpressions, ...portrait.blockedActions].filter(Boolean)
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
        thesis:
          locale === 'ko'
            ? `${portrait.label} 축은 ${timescale} 구간에서 ${status === 'open' ? '열림' : status === 'blocked' ? '방어' : '혼합'} 상태로 읽힙니다.`
            : `${portrait.label} reads as ${
                status === 'open' ? 'open' : status === 'blocked' ? 'defensive' : 'mixed'
              } in the ${timescale} window.`,
        entryConditions: (timing?.entryConditions || []).slice(0, 2),
        abortConditions: (timing?.abortConditions || []).slice(0, 2),
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
      thesis: portrait.activationThesis || portrait.baselineThesis || portrait.summary,
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

function buildAppliedProfile(
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

function buildEventOutlook(
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

  return eventDefs.map((eventDef) => {
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
    const baseEntry =
      eventDef.key === 'commitment'
        ? relationshipProfile.commitmentConditions
        : eventDef.key === 'careerEntry'
          ? careerProfile.hiringTriggers
          : branch?.conditions || state?.supportSignals || []
    const baseAbort =
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
      summary:
        branch?.summary ||
        state?.thesis ||
        portrait?.summary ||
        (locale === 'ko'
          ? `${eventDef.label} 사건은 ${localizeDomain(eventDef.domain, locale)} 축 조건이 맞을 때 열립니다.`
          : `${eventDef.label} opens when the ${localizeDomain(eventDef.domain, locale)} axis conditions line up.`),
      entryConditions: uniq(baseEntry.filter(Boolean)).slice(0, 4),
      abortConditions: uniq(baseAbort.filter(Boolean)).slice(0, 4),
      nextMove,
    }
  })
}

function buildBirthTimeHypotheses(
  core: DestinyCoreResult,
  locale: 'ko' | 'en',
  domainStateGraph: AdapterPersonDomainState[]
): AdapterBirthTimeHypothesis[] {
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

function buildCrossConflictMap(
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

function buildPastEventReconstruction(
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

function buildUncertaintyEnvelope(
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

function buildEvidenceLedger(core: DestinyCoreResult) {
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

export function buildPersonModel(core: DestinyCoreResult, locale: 'ko' | 'en'): AdapterPersonModel {
  const focusLabel = localizeDomain(core.canonical.focusDomain, locale)
  const actionLabel = localizeDomain(core.canonical.actionFocusDomain, locale)
  const riskDomain = rankRiskAxis(core)
  const riskLabel = localizeDomain(riskDomain, locale)
  const topDecisionLabel = getTopDecisionLabel(core, locale) || core.canonical.primaryAction
  const latentAxes = buildLatentTopAxes(core, locale)
  const domainStateGraph = buildDomainStateGraph(core, locale)
  const relationshipProfile = buildRelationshipProfile(core, locale)
  const careerProfile = buildCareerProfile(core, locale)
  const appliedProfile = buildAppliedProfile(core, locale, domainStateGraph)
  const eventOutlook = buildEventOutlook(
    core,
    locale,
    domainStateGraph,
    relationshipProfile,
    careerProfile
  )
  const birthTimeHypotheses = buildBirthTimeHypotheses(core, locale, domainStateGraph)
  const crossConflictMap = buildCrossConflictMap(core, locale, domainStateGraph)
  const pastEventReconstruction = buildPastEventReconstruction(core, locale, domainStateGraph)
  const uncertaintyEnvelope = buildUncertaintyEnvelope(core, locale, domainStateGraph)

  return {
    subject: locale === 'ko' ? '다차원 인물 모델' : 'Multidimensional Person Model',
    overview:
      locale === 'ko'
        ? `${focusLabel}이 기본 구조이고 ${actionLabel}이 실제 행동축이며, 현재 가장 예민한 리스크 축은 ${riskLabel}입니다. 기회가 열릴 때는 ${topDecisionLabel} 쪽이 먼저 활성화됩니다.`
        : `${focusLabel} is the baseline structure, ${actionLabel} is the live action axis, and ${riskLabel} is the most sensitive risk axis. When opportunity opens, ${topDecisionLabel} activates first.`,
    structuralCore: {
      focusDomain: core.canonical.focusDomain,
      actionFocusDomain: core.canonical.actionFocusDomain,
      riskAxisDomain: riskDomain,
      gradeLabel: core.canonical.gradeLabel,
      phaseLabel: core.canonical.phaseLabel,
      overview:
        locale === 'ko'
          ? `${focusLabel}이 인물의 뼈대이고 ${actionLabel}이 현재 전면 행동축입니다.`
          : `${focusLabel} is the structural backbone and ${actionLabel} is the front action axis.`,
      latentAxes: latentAxes.slice(0, 6).map((axis) => axis.label),
    },
    formationProfile: buildFormationProfile(core, locale),
    timeProfile: buildTimeProfile(core, locale),
    layers: buildPersonLayers(core, locale),
    dimensions: buildPersonDimensions(core, locale),
    domainStateGraph,
    domainPortraits: buildDomainPortraits(core, locale),
    states: buildPersonStates(core, locale),
    appliedProfile,
    relationshipProfile,
    careerProfile,
    futureBranches: buildFutureBranches(core, locale),
    eventOutlook,
    birthTimeHypotheses,
    crossConflictMap,
    pastEventReconstruction,
    uncertaintyEnvelope,
    evidenceLedger: buildEvidenceLedger(core),
  }
}
