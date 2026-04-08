import type { SignalDomain } from './signalSynthesizer'
import type { DestinyCoreResult } from './runDestinyCore'
import type {
  AdapterPersonModel,
  AdapterBirthTimeHypothesis,
  AdapterCrossConflictItem,
  AdapterPersonAppliedProfile,
  AdapterPersonDimension,
  AdapterPersonDomainState,
  AdapterPersonEventOutlook,
  AdapterPersonFutureBranch,
  AdapterPersonLayer,
  AdapterPastEventMarker,
  AdapterPersonState,
  AdapterPersonUncertaintyEnvelope,
} from './adaptersTypes'
import { repairPossiblyMojibakeText } from '../textRepair'
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

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function repairLocaleText(text: string, locale: 'ko' | 'en'): string {
  return locale === 'ko' ? repairPossiblyMojibakeText(text) : text
}

const TOKEN_LABELS_KO: Record<string, string> = {
  career: '커리어',
  relationship: '관계',
  wealth: '재정',
  health: '건강',
  move: '이동',
  movement: '이동',
  growth: '확장',
  rebuild: '재정비',
  guardrail: '조건 점검',
  activation: '활성',
  expansion: '확장',
  recovery: '회복',
  structure: '구조',
  pattern: '패턴',
  window: '구간',
  timing: '타이밍',
  decision: '판단',
  review: '검토',
  specialist: '전문화',
  specialisttrack: '전문화 트랙',
  contract: '계약',
  negotiation: '협상',
  promotion: '승진',
  reset: '재정렬',
}

const PHRASE_LABELS_KO: Array<[RegExp, string]> = [
  [/Career Expansion Pattern/gi, '커리어 확장 패턴'],
  [/Career Rebuild Pattern/gi, '커리어 재정비 패턴'],
  [/Relationship Growth Pattern/gi, '관계 확장 패턴'],
  [/Relationship Activation Pattern/gi, '관계 활성 패턴'],
  [/Movement Guardrail Pattern/gi, '이동 조건 점검 패턴'],
  [/Health Recovery Pattern/gi, '건강 회복 패턴'],
  [/Wealth Structure Pattern/gi, '재정 구조 패턴'],
  [/career_growth/gi, '커리어 확장'],
  [/career_rebuild/gi, '커리어 재정비'],
  [/relationship_growth/gi, '관계 확장'],
  [/relationship_activation/gi, '관계 활성'],
  [/movement_guardrail/gi, '이동 조건 점검'],
  [/health_recovery/gi, '건강 회복'],
  [/wealth_structure/gi, '재정 구조'],
  [/\bcareer(?=은|는|이|가|을|를|축|\s)/gi, '커리어'],
  [/\brelationship(?=은|는|이|가|을|를|축|\s)/gi, '관계'],
  [/\bwealth(?=은|는|이|가|을|를|축|\s)/gi, '재정'],
  [/\bhealth(?=은|는|이|가|을|를|축|\s)/gi, '건강'],
  [/\bmove(?=은|는|이|가|을|를|축|\s)/gi, '이동'],
]

function localizeStructuredToken(token: string, locale: 'ko' | 'en'): string {
  const cleaned = String(token || '').trim()
  if (!cleaned) return ''
  const parts = cleaned
    .split(/[_\s-]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)

  if (!parts.length) return cleaned
  if (locale !== 'ko') {
    return parts.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(' ')
  }

  return parts
    .map((part) => TOKEN_LABELS_KO[part] || part)
    .join(' ')
    .trim()
}

export function normalizePersonModelText(text: string | undefined, locale: 'ko' | 'en'): string {
  const repaired = repairLocaleText(String(text || '').trim(), locale)
  if (!repaired) return ''

  let normalized = repaired
  if (locale === 'ko') {
    for (const [pattern, replacement] of PHRASE_LABELS_KO) {
      normalized = normalized.replace(pattern, replacement)
    }
  }

  normalized = normalized.replace(/\b[a-z]+(?:[_-][a-z]+)+\b/gi, (token) =>
    localizeStructuredToken(token, locale)
  )

  if (locale === 'ko') {
    normalized = normalized
      .replace(/커리어은/g, '커리어는')
      .replace(/관계은/g, '관계는')
      .replace(/패턴 패턴/g, '패턴')
      .replace(/대운,\s*세운가/g, '대운과 세운 흐름이')
      .replace(/대운,\s*세운이/g, '대운과 세운 흐름이')
  }

  normalized = normalized.replace(/\s{2,}/g, ' ').trim()
  return repairLocaleText(normalized, locale)
}

export function normalizePersonModelList(
  items: Array<string | undefined | null>,
  locale: 'ko' | 'en'
): string[] {
  return uniq(
    items
      .map((item) => normalizePersonModelText(String(item || ''), locale))
      .map((item) => item.trim())
      .filter(Boolean)
  )
}

export function round2(value: number): number {
  return Math.round(clamp01(value) * 100) / 100
}

export function avg(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value))
  if (!valid.length) return 0
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

export function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

export function summarizeWindow(window: string | undefined, locale: 'ko' | 'en'): string {
  const value = String(window || '').trim()
  if (value) return value
  return locale === 'ko' ? '현재' : 'current'
}

export function getModePressureScore(mode: 'execute' | 'verify' | 'prepare'): number {
  if (mode === 'prepare') return 0.78
  if (mode === 'verify') return 0.56
  return 0.28
}

export function getModeSupportScore(mode: 'execute' | 'verify' | 'prepare'): number {
  if (mode === 'execute') return 0.78
  if (mode === 'verify') return 0.56
  return 0.4
}

export function getModeLabel(mode: 'execute' | 'verify' | 'prepare', locale: 'ko' | 'en'): string {
  if (locale !== 'ko') return mode
  if (mode === 'execute') return '실행 우위'
  if (mode === 'verify') return '검토 우위'
  return '준비 우위'
}

export function buildDimensionScores(
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

export function mapDomainState(
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

export function mapTimingStatus(
  agreement: number,
  contradiction: number
): 'open' | 'mixed' | 'blocked' {
  if (agreement >= Math.max(0.58, contradiction + 0.14)) return 'open'
  if (contradiction >= Math.max(0.52, agreement + 0.14)) return 'blocked'
  return 'mixed'
}

export function domainBySignalLabel(label: string): SignalDomain | null {
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

export function pickLeadDomains(core: DestinyCoreResult): SignalDomain[] {
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

export function buildDimensionSummary(params: {
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
      ? `${params.domainLabel} 축은 ${modeLabel} 상태이며 ${windowLabel} 구간에서 가장 또렷하게 드러납니다. ${normalizePersonModelText(manifestation, params.locale)}`
      : `${params.domainLabel} 축은 ${modeLabel} 상태이며 ${windowLabel} 구간에서 가장 또렷하게 드러납니다.`
  }

  return manifestation
    ? `${params.domainLabel} stays in ${modeLabel} mode and expresses most clearly in the ${windowLabel} window. ${manifestation}`
    : `${params.domainLabel} stays in ${modeLabel} mode and expresses most clearly in the ${windowLabel} window.`
}

export function buildPersonDimensions(
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

export function buildPersonLayers(
  core: DestinyCoreResult,
  locale: 'ko' | 'en'
): AdapterPersonLayer[] {
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
      label: repairLocaleText(locale === 'ko' ? 'íƒ€ê³ ë‚œ êµ¬ì¡°' : 'Foundation', locale),
      summary: structureFacet?.summary || core.canonical.thesis,
      bullets: (structureFacet?.details || []).slice(0, 4),
    },
    {
      key: 'formation',
      label: repairLocaleText(locale === 'ko' ? 'í˜•ì„±ëœ íŒ¨í„´' : 'Formation', locale),
      summary: repairLocaleText(
        locale === 'ko'
          ? topPatternFamilies.length
            ? `ë°˜ë³µì ìœ¼ë¡œ êµ³ì€ íŒ¨í„´ ì¶•ì€ ${topPatternFamilies.join(', ')}ìž…ë‹ˆë‹¤.`
            : 'ë°˜ë³µ íŒ¨í„´ì€ êµ¬ì¡°ì¶•ê³¼ íƒ€ì´ë°ì¶•ì˜ ê²°í•©ìœ¼ë¡œ í˜•ì„±ë©ë‹ˆë‹¤.'
          : topPatternFamilies.length
            ? `The repeated pattern families are ${topPatternFamilies.join(', ')}.`
            : 'Repeated patterns are formed by the structure and timing stack.',
        locale
      ),
      bullets: [
        ...(cycleFacet?.details || []).slice(0, 2),
        ...(riskFacet?.details || []).slice(0, 2),
      ].slice(0, 4),
    },
    {
      key: 'active',
      label: repairLocaleText(locale === 'ko' ? 'í˜„ìž¬ í™œì„± ìƒíƒœ' : 'Active State', locale),
      summary: triggerFacet?.summary || cycleFacet?.summary || core.canonical.primaryAction,
      bullets: [
        ...(triggerFacet?.details || []).slice(0, 2),
        ...(cycleFacet?.details || []).slice(0, 2),
      ].slice(0, 4),
    },
    {
      key: 'future',
      label: repairLocaleText(locale === 'ko' ? 'ë¯¸ëž˜ ë¶„ê¸°' : 'Future Branches', locale),
      summary: repairLocaleText(
        topBranch?.summary ||
          (locale === 'ko'
            ? 'ì•žìœ¼ë¡œì˜ ë¶„ê¸°ëŠ” ìƒìœ„ ì‹œë‚˜ë¦¬ì˜¤ì™€ íƒ€ì´ë° ì°½ì—ì„œ ê°ˆë¦½ë‹ˆë‹¤.'
            : 'The future branch is decided by the top scenario stack and timing window.'),
        locale
      ),
      bullets: [
        ...(topBranch?.entry || []).slice(0, 2),
        ...(topBranch?.abort || []).slice(0, 2),
      ].slice(0, 4),
    },
  ]
}

export function buildStateSummary(params: {
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
      return repairLocaleText(
        `${params.focusLabel}ì´ ê¸°ë³¸ ìžì•„ì˜ ë°°ê²½ì¶•ì´ê³  ${params.actionLabel}ì´ ì‹¤ì œ í–‰ë™ì¶•ìœ¼ë¡œ ì˜¬ë¼ì˜¤ëŠ” ì‚¬ëžŒìž…ë‹ˆë‹¤.`,
        params.locale
      )
    }
    if (params.kind === 'pressure') {
      return repairLocaleText(
        `ì••ë°•ì´ ê±¸ë¦¬ë©´ ${params.riskLabel} ì¶•ì´ ë¨¼ì € ì˜ˆë¯¼í•´ì§€ê³  íŒë‹¨ì€ ë” ë³´ìˆ˜ì ìœ¼ë¡œ ìˆ˜ë ´í•©ë‹ˆë‹¤.`,
        params.locale
      )
    }
    return repairLocaleText(
      `${params.topDecisionLabel} ìª½ì´ ê¸°íšŒ ìƒíƒœì—ì„œ ë¨¼ì € ì—´ë¦¬ë©°, ${params.branchSummary || `${params.actionLabel} ì¶•ì—ì„œ ìƒìœ„ ë¶„ê¸°ê°€ ì—´ë¦½ë‹ˆë‹¤.`}`,
      params.locale
    )
  }

  if (params.kind === 'baseline') {
    return `${params.focusLabel} is the baseline identity axis, while ${params.actionLabel} becomes the live action axis.`
  }
  if (params.kind === 'pressure') {
    return `Under pressure, the ${params.riskLabel} axis becomes sensitive first and decisions narrow into a more defensive posture.`
  }
  return `${params.topDecisionLabel} opens first in opportunity mode, and ${params.branchSummary || `the top branch opens on the ${params.actionLabel} axis.`}`
}

export function buildPersonStates(
  core: DestinyCoreResult,
  locale: 'ko' | 'en'
): AdapterPersonState[] {
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
      label: repairLocaleText(locale === 'ko' ? 'ê¸°ë³¸ ìƒíƒœ' : 'Baseline', locale),
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
      label: repairLocaleText(locale === 'ko' ? 'ì••ë°• ìƒíƒœ' : 'Pressure', locale),
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
      label: repairLocaleText(locale === 'ko' ? 'ê¸°íšŒ ìƒíƒœ' : 'Opportunity', locale),
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

export function buildFutureBranches(
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

export function buildFormationProfile(core: DestinyCoreResult, locale: 'ko' | 'en') {
  const repeatedPatternFamilies = normalizePersonModelList(
    core.canonical.topPatterns
      .slice(0, 4)
      .map((item) => String(item.family || item.id || '').trim())
      .filter(Boolean),
    locale
  )
  const dominantLatentGroups = uniq(
    buildLatentTopAxes(core, locale)
      .slice(0, 4)
      .map((axis) => axis.group)
      .filter(Boolean)
  )
  const pressureHabits = normalizePersonModelList(
    core.canonical.manifestations
      .flatMap((item) => item.riskExpressions || [])
      .slice(0, 4)
      .filter(Boolean),
    locale
  )
  const supportHabits = normalizePersonModelList(
    core.canonical.manifestations
      .flatMap((item) => item.likelyExpressions || [])
      .slice(0, 4)
      .filter(Boolean),
    locale
  )

  return {
    summary: normalizePersonModelText(
      locale === 'ko'
        ? repeatedPatternFamilies.length
          ? `이 사람은 ${repeatedPatternFamilies.join(', ')} 계열 패턴이 반복되며 성향이 굳어집니다.`
          : '이 사람은 반복되는 구조 패턴과 타이밍 패턴이 행동 습관을 만드는 쪽으로 굳어집니다.'
        : repeatedPatternFamilies.length
          ? `This person tends to consolidate around ${repeatedPatternFamilies.join(', ')} pattern families.`
          : 'This person is shaped by repeated structure and timing patterns.',
      locale
    ),
    repeatedPatternFamilies,
    dominantLatentGroups,
    pressureHabits,
    supportHabits,
  }
}

export function buildTimeProfile(core: DestinyCoreResult, locale: 'ko' | 'en') {
  const windows = core.canonical.domainTimingWindows.slice(0, 4).map((item) => ({
    domain: item.domain,
    label: localizeDomain(item.domain, locale),
    window: summarizeWindow(item.window, locale),
    granularity: String(item.timingGranularity || ''),
    confidence: round2(item.confidence || 0),
    whyNow: normalizePersonModelText(item.whyNow, locale),
    entryConditions: normalizePersonModelList((item.entryConditions || []).slice(0, 3), locale),
    abortConditions: normalizePersonModelList((item.abortConditions || []).slice(0, 3), locale),
  }))
  const activationSources = core.canonical.manifestations
    .slice(0, 4)
    .flatMap((item) =>
      (item.activationSources || []).slice(0, 3).map((source) => ({
        domain: item.domain,
        source: source.source,
        label: normalizePersonModelText(source.label, locale),
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
    timingNarrative: normalizePersonModelText(
      topTiming?.timingConflictNarrative ||
        (locale === 'ko'
          ? '현재 타이밍은 구조 신호와 촉발 신호를 함께 읽어야 제대로 보입니다.'
          : 'Current timing should be read through structure and trigger together.'),
      locale
    ),
    confidence: round2(core.canonical.confidence || 0),
    windows,
    activationSources,
  }
}

export function buildDomainPortraits(core: DestinyCoreResult, locale: 'ko' | 'en') {
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
      baselineThesis: normalizePersonModelText(manifestation?.baselineThesis || '', locale),
      activationThesis: normalizePersonModelText(manifestation?.activationThesis || '', locale),
      likelyExpressions: normalizePersonModelList(
        (manifestation?.likelyExpressions || []).slice(0, 4),
        locale
      ),
      riskExpressions: normalizePersonModelList(
        (manifestation?.riskExpressions || []).slice(0, 4),
        locale
      ),
      allowedActions: getAllowedActionLabels(verdict?.allowedActions || [], locale).slice(0, 3),
      blockedActions: getBlockedActionLabels(verdict?.blockedActions || [], locale).slice(0, 3),
    }
  })
}

export function buildRelationshipProfile(core: DestinyCoreResult, locale: 'ko' | 'en') {
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
    summary: normalizePersonModelText(
      relationshipPortrait?.summary ||
        (locale === 'ko'
          ? '관계 축은 현재 구조와 타이밍을 함께 봐야 정확히 읽힙니다.'
          : 'The relationship axis currently needs to be read through structure and timing together.'),
      locale
    ),
    partnerArchetypes: normalizePersonModelList(
      (relationshipManifestation?.likelyExpressions || []).slice(0, 4),
      locale
    ),
    inflowPaths: normalizePersonModelList(relationshipBranch?.conditions || [], locale),
    commitmentConditions: normalizePersonModelList(
      relationshipPortrait?.allowedActions || [],
      locale
    ),
    breakPatterns: normalizePersonModelList(
      [
        ...(relationshipManifestation?.riskExpressions || []).slice(0, 3),
        ...(relationshipBranch?.blockers || []).slice(0, 2),
      ].slice(0, 4),
      locale
    ),
  }
}

export function buildCareerProfile(core: DestinyCoreResult, locale: 'ko' | 'en') {
  const careerPortrait = buildDomainPortraits(core, locale).find((item) => item.domain === 'career')
  const careerManifestation = core.canonical.manifestations.find((item) => item.domain === 'career')
  const careerBranch = buildFutureBranches(core, locale).find((item) => item.domain === 'career')

  return {
    summary: normalizePersonModelText(
      careerPortrait?.summary ||
        (locale === 'ko'
          ? '커리어 축은 현재 구조와 타이밍이 함께 움직이는 상태입니다.'
          : 'The career axis currently moves through structure and timing together.'),
      locale
    ),
    suitableLanes: normalizePersonModelList(
      (careerManifestation?.likelyExpressions || []).slice(0, 4),
      locale
    ),
    executionStyle: normalizePersonModelList(
      [careerPortrait?.baselineThesis || '', careerPortrait?.activationThesis || '']
        .filter(Boolean)
        .slice(0, 3),
      locale
    ),
    hiringTriggers: normalizePersonModelList(careerBranch?.conditions || [], locale),
    blockers: normalizePersonModelList(
      [
        ...(careerPortrait?.blockedActions || []).slice(0, 2),
        ...(careerBranch?.blockers || []).slice(0, 2),
      ].slice(0, 4),
      locale
    ),
  }
}

export function parseBirthHour(raw: string | undefined): number | null {
  const value = String(raw || '').trim()
  const match = value.match(/^(\d{1,2})[:.]?(\d{2})?/)
  if (!match) return null
  const hour = Number(match[1])
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null
  return hour
}

export function normalizeHour(hour: number): number {
  const normalized = hour % 24
  return normalized < 0 ? normalized + 24 : normalized
}

export function hourToBucket(hour: number): AdapterBirthTimeHypothesis['bucket'] {
  if (hour < 6) return 'night'
  if (hour < 9) return 'early-morning'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function formatBirthTimeCandidate(hour: number): string {
  return `${String(normalizeHour(hour)).padStart(2, '0')}:00`
}

export function getBirthBucketLabel(
  bucket: AdapterBirthTimeHypothesis['bucket'],
  locale: 'ko' | 'en'
): string {
  const labels = {
    ko: {
      'early-morning': 'ì´ë¥¸ ì˜¤ì „ ê°€ì„¤',
      morning: 'ì˜¤ì „ ê°€ì„¤',
      afternoon: 'ì˜¤í›„ ê°€ì„¤',
      evening: 'ì €ë… ê°€ì„¤',
      night: 'ì•¼ê°„ ê°€ì„¤',
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

export function getCandidateActionFit(
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

export function getCandidateRecoveryFit(
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

export function calculateProfileAge(
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

export function formatAgeWindow(startAge: number, endAge: number, locale: 'ko' | 'en'): string {
  const safeStart = Math.max(0, startAge)
  const safeEnd = Math.max(safeStart, endAge)
  return locale === 'ko' ? `${safeStart}-${safeEnd}ì„¸` : `ages ${safeStart}-${safeEnd}`
}

export function buildPeakWindows(hour: number | null, locale: 'ko' | 'en'): string[] {
  if (hour === null) {
    return locale === 'ko'
      ? ['ì˜¤ì „ ì§‘ì¤‘ ë¸”ë¡', 'ì˜¤í›„ ì ê²€ ë¸”ë¡']
      : ['Morning focus block', 'Afternoon review block']
  }
  if (hour < 8) {
    return locale === 'ko'
      ? ['ì´ë¥¸ ì˜¤ì „ ê¹Šì€ ì§‘ì¤‘', 'ì ì‹¬ ì „ ê²°ì • ë¸”ë¡']
      : ['Early-morning deep focus', 'Pre-lunch decision block']
  }
  if (hour < 15) {
    return locale === 'ko'
      ? ['ì˜¤ì „ ì¤‘ë°˜ ì‹¤í–‰ ë¸”ë¡', 'ëŠ¦ì€ ì˜¤í›„ ì •ë¦¬ ë¸”ë¡']
      : ['Mid-morning execution block', 'Late-afternoon consolidation block']
  }
  return locale === 'ko'
    ? ['ëŠ¦ì€ ì˜¤í›„ ì‹¤í–‰ ë¸”ë¡', 'ë°¤ ì „ ì¡°ìš©í•œ ì •ë¦¬ ë¸”ë¡']
    : ['Late-afternoon execution block', 'Pre-night quiet consolidation block']
}

export function buildRecoveryWindows(hour: number | null, locale: 'ko' | 'en'): string[] {
  if (hour !== null && hour < 8) {
    return locale === 'ko'
      ? ['ì˜¤í›„ ì´ˆë°˜ ì§§ì€ íšŒë³µ', 'ë°¤ 11ì‹œ ì´ì „ ìˆ˜ë©´ ì§„ìž…']
      : ['Early-afternoon reset', 'Sleep entry before 11pm']
  }
  return locale === 'ko'
    ? ['ì €ë… ìžê·¹ ì°¨ë‹¨ êµ¬ê°„', 'ë°¤ 12ì‹œ ì´ì „ ìˆ˜ë©´ ì§„ìž…']
    : ['Evening low-stimulus window', 'Sleep entry before midnight']
}
