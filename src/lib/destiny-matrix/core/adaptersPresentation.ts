import type { DestinyCoreResult } from './runDestinyCore'
import type { SignalDomain } from './signalSynthesizer'
import { formatDecisionActionLabels, formatPolicyCheckLabels } from './actionCopy'
import type {
  AdapterArbitrationBrief,
  AdapterBranchCandidate,
  AdapterLatentAxis,
  AdapterMatrixViewCell,
  AdapterMatrixViewRow,
  AdapterProjectionBlock,
  AdapterProjectionSet,
  AdapterSingleUserModel,
  AdapterTimingMatrixRow,
} from './adaptersTypes'

export function localizeDomain(domain: SignalDomain, locale: 'ko' | 'en'): string {
  if (locale === 'ko') {
    const ko: Record<SignalDomain, string> = {
      personality: '\uC131\uD5A5',
      career: '\uCEE4\uB9AC\uC5B4',
      relationship: '\uAD00\uACC4',
      wealth: '\uC7AC\uC815',
      health: '\uAC74\uAC15',
      spirituality: '\uC601\uC131',
      timing: '\uD0C0\uC774\uBC0D',
      move: '\uC774\uB3D9',
    }
    return ko[domain] || domain
  }

  const en: Record<SignalDomain, string> = {
    personality: 'personality',
    career: 'career',
    relationship: 'relationship',
    wealth: 'wealth',
    health: 'health',
    spirituality: 'spirituality',
    timing: 'timing',
    move: 'move',
  }
  return en[domain] || domain
}

function getFocusDomainVerdict(core: DestinyCoreResult) {
  return (
    core.canonical.domainVerdicts.find((item) => item.domain === core.canonical.focusDomain) || null
  )
}

function getActionFocusDomainVerdict(core: DestinyCoreResult) {
  return (
    core.canonical.domainVerdicts.find(
      (item) => item.domain === core.canonical.actionFocusDomain
    ) || null
  )
}

export function getTopDecisionAction(core: DestinyCoreResult): string | null {
  const topAction = core.canonical.topDecision?.action || null
  const topDomain = core.canonical.topDecision?.domain || null
  if (topAction && topDomain === core.canonical.actionFocusDomain) return topAction
  const actionVerdict = getActionFocusDomainVerdict(core)
  return actionVerdict?.allowedActions?.[0] || topAction
}

export function getTopDecisionLabel(core: DestinyCoreResult, locale: 'ko' | 'en'): string | null {
  const topLabel = core.canonical.topDecision?.label || null
  const topDomain = core.canonical.topDecision?.domain || null
  if (topLabel && topDomain === core.canonical.actionFocusDomain) {
    const actionDomainLabel = localizeDomain(core.canonical.actionFocusDomain, locale)
    return topLabel
      .replace(new RegExp(`^${actionDomainLabel}\\s*:\\s*`, 'i'), '')
      .replace(new RegExp(`^${actionDomainLabel}\\s+`, 'i'), '')
      .trim()
  }

  const actionVerdict = getActionFocusDomainVerdict(core)
  const action = actionVerdict?.allowedActions?.[0]
  if (!action) return topLabel
  const actionLabel = formatDecisionActionLabels([action], locale, false)[0]
  if (!actionLabel) return topLabel
  return actionLabel
}

export function getAllowedActionLabels(actions: string[], locale: 'ko' | 'en'): string[] {
  return formatDecisionActionLabels(actions, locale, false)
}

export function getBlockedActionLabels(actions: string[], locale: 'ko' | 'en'): string[] {
  return formatDecisionActionLabels(actions, locale, true)
}

function localizeAdapterFreeText(text: string | undefined | null, locale: 'ko' | 'en'): string {
  const value = String(text || '').trim()
  if (!value) return ''
  if (locale !== 'ko') return value

  let out = value
    .replace(/\bpersonality\b/gi, '성향')
    .replace(/\bcareer\b/gi, '커리어')
    .replace(/\brelationship\b/gi, '관계')
    .replace(/\bwealth\b/gi, '재정')
    .replace(/\bhealth\b/gi, '건강')
    .replace(/\bmove\b/gi, '이동')
    .replace(/\bspirituality\b/gi, '장기 방향')
    .replace(/\btiming\b/gi, '타이밍')
    .replace(/\bnow\b/gi, '지금')
    .replace(/\bunknown\b/gi, '현재')
    .replace(/\bweek\b/gi, '주 단위')
    .replace(/\bfortnight\b/gi, '2주 단위')
    .replace(/\bmonth\b/gi, '월 단위')
    .replace(/\bseason\b/gi, '분기 단위')
    .replace(/\bverify\b/gi, '검토 우선')
    .replace(/\bprepare\b/gi, '준비 우선')
    .replace(/\bexecute\b/gi, '실행 우선')
    .replace(/\bstabilize\b/gi, '안정화')
    .replace(/\bcaution\b/gi, '주의 신호')
    .replace(/\bcore pattern family\b/gi, '핵심 흐름')
    .replace(/\bcareer expansion pattern\b/gi, '커리어 확장 흐름')
    .replace(/\brelationship tension pattern\b/gi, '관계 긴장 흐름')
    .replace(/\bwealth volatility pattern\b/gi, '재정 변동성 흐름')
    .replace(/\bburnout risk pattern\b/gi, '번아웃 리스크 흐름')
    .replace(/\bmovement guardrail window\b/gi, '이동·변화 경계 구간')
    .replace(/\bpromotion review\b/gi, '승진 검토')
    .replace(/\bcontract negotiation\b/gi, '조건 협상')
    .replace(/\bspecialist track\b/gi, '전문화 트랙')
    .replace(/\bExpansion without role clarity can create delivery strain\.?\b/gi, '역할과 범위가 불분명하면 실행 부담이 커질 수 있습니다')
    .replace(/\bA strong opportunity signal can hide ([^\s]+) and ([^\s]+) risk\./gi, (_, left: string, right: string) =>
      '강한 기회 신호가 ' + localizeAdapterFreeText(left, 'ko') + '와 ' + localizeAdapterFreeText(right, 'ko') + ' 리스크를 가릴 수 있습니다.'
    )
    .replace(/\b\w+\s+stayed secondary because total support remained below the winner\b/gi, '최종 지지가 승자축보다 약해 보조축에 머물렀습니다')
    .replace(/\bweak_both\b/gi, '구조와 촉발이 모두 약한 상태')
    .replace(/\baligned\b/gi, '구조와 촉발이 함께 맞물린 상태')
    .replace(/\breadiness_ahead\b/gi, '구조가 먼저 열린 상태')
    .replace(/\btrigger_ahead\b/gi, '촉발이 먼저 앞선 상태')
    .replace(/\s+/g, ' ')
    .trim()

  out = out.replace(/([가-힣]+)은 /g, '$1은 ')
  out = out.replace(/([가-힣]+)이 /g, '$1이 ')
  return out
}

function buildEvidenceProjectionSummary(
  locale: 'ko' | 'en',
  topSignals: string[],
  topPatterns: string[],
  topScenarios: string[]
): string {
  if (locale === 'ko') {
    const signalCount = topSignals.length
    const patternCount = topPatterns.length
    const scenarioCount = topScenarios.length
    return `상위 신호 ${signalCount}개와 핵심 패턴 ${patternCount}개, 시나리오 ${scenarioCount}개가 이번 해석의 골격입니다.`
  }

  return `Top signals (${topSignals.length}), patterns (${topPatterns.length}), and scenarios (${topScenarios.length}) form the current spine.`
}

function buildEvidenceProjectionReasons(
  locale: 'ko' | 'en',
  topSignals: string[],
  topPatterns: string[],
  topScenarios: string[]
): string[] {
  if (locale === 'ko') {
    return [
      topSignals.length ? `핵심 신호 ${topSignals.length}개가 동시에 작동 중입니다.` : '',
      topPatterns.length ? `상위 패턴 ${topPatterns.length}개가 같은 방향으로 겹칩니다.` : '',
      topScenarios.length ? `대표 시나리오 ${topScenarios.length}개가 현재 판단을 지지합니다.` : '',
    ].filter(Boolean)
  }

  return [
    topSignals.length ? `${topSignals.length} lead signals are active together.` : '',
    topPatterns.length ? `${topPatterns.length} lead patterns overlap in the same direction.` : '',
    topScenarios.length ? `${topScenarios.length} lead scenarios are supporting the current read.` : '',
  ].filter(Boolean)
}

export function rankRiskAxis(core: DestinyCoreResult): SignalDomain {
  const candidateDomains = core.canonical.domainVerdicts
    .map((item) => item.domain)
    .filter((domain) =>
      ['career', 'relationship', 'wealth', 'health', 'move', 'personality'].includes(domain)
    ) as SignalDomain[]
  const uniqueDomains = [...new Set(candidateDomains)]
  const scored = uniqueDomains.map((domain) => {
    const verdict = core.canonical.domainVerdicts.find((item) => item.domain === domain)
    const timing = core.canonical.domainTimingWindows.find((item) => item.domain === domain)
    const manifestation = core.canonical.manifestations.find((item) => item.domain === domain)
    let score = 0
    if (verdict?.mode === 'prepare') score += 0.45
    else if (verdict?.mode === 'verify') score += 0.28
    else score += 0.08
    score += Math.min((verdict?.blockedActions?.length || 0) * 0.08, 0.24)
    score += Math.min((verdict?.confidence || 0) * 0.08, 0.08)
    if (timing?.timingConflictMode === 'weak_both') score += 0.28
    else if (timing?.timingConflictMode === 'trigger_ahead') score += 0.18
    else if (timing?.timingConflictMode === 'readiness_ahead') score += 0.12
    score += Math.min((timing?.abortConditions?.length || 0) * 0.06, 0.18)
    score += Math.min((manifestation?.riskExpressions?.length || 0) * 0.08, 0.24)
    return { domain, score }
  })

  return (
    scored.sort((a, b) => b.score - a.score)[0]?.domain ||
    core.canonical.actionFocusDomain ||
    core.canonical.focusDomain
  )
}

export function buildTimingMatrix(core: DestinyCoreResult, locale: 'ko' | 'en'): AdapterTimingMatrixRow[] {
  const order: SignalDomain[] = ['career', 'relationship', 'wealth', 'health', 'move', 'personality']
  return [...(core.canonical.domainTimingWindows || [])]
    .filter((item) => order.includes(item.domain))
    .sort(
      (a, b) =>
        order.indexOf(a.domain) - order.indexOf(b.domain) ||
        b.timingRelevance - a.timingRelevance ||
        b.confidence - a.confidence
    )
    .slice(0, 6)
    .map((item) => {
      const label = localizeDomain(item.domain, locale)
      const window = localizeAdapterFreeText(item.window, locale)
      const granularity = localizeAdapterFreeText(item.timingGranularity, locale)
      const summary =
        locale === 'ko'
          ? `${label}은 ${window} 창이 가장 직접적이며, ${localizeAdapterFreeText(item.timingConflictNarrative, locale)}`
          : `${label} is most active in the ${window} window, and ${localizeAdapterFreeText(item.timingConflictNarrative, locale)}`
      return {
        domain: item.domain,
        label,
        window,
        granularity,
        confidence: item.confidence,
        conflictMode: item.timingConflictMode,
        summary,
      }
    })
}

function localizeTimescale(
  timescale: 'now' | '1-3m' | '3-6m' | '6-12m',
  locale: 'ko' | 'en'
): string {
  if (locale === 'ko') {
    if (timescale === 'now') return '지금'
    if (timescale === '1-3m') return '1~3개월'
    if (timescale === '3-6m') return '3~6개월'
    return '6~12개월'
  }
  return timescale
}

export function buildMatrixView(core: DestinyCoreResult, locale: 'ko' | 'en'): AdapterMatrixViewRow[] {
  const preferred: SignalDomain[] = [
    core.canonical.actionFocusDomain,
    core.canonical.focusDomain,
    rankRiskAxis(core),
    'career',
    'relationship',
    'wealth',
    'health',
    'move',
  ].filter((value, index, array): value is SignalDomain => Boolean(value) && array.indexOf(value) === index)

  const matrix = core.canonical.crossAgreementMatrix || []
  return preferred
    .map((domain) => matrix.find((row) => row.domain === domain))
    .filter((row): row is NonNullable<(typeof matrix)[number]> => Boolean(row))
    .slice(0, 4)
    .map((row) => {
      const cells: AdapterMatrixViewCell[] = (['now', '1-3m', '3-6m', '6-12m'] as const)
        .map((timescale) => {
          const cell = row.timescales?.[timescale]
          if (!cell) return null
          const agreementPct = Math.round((cell.agreement || 0) * 100)
          const contradictionPct = Math.round((cell.contradiction || 0) * 100)
          const leadLag = cell.leadLag ?? row.leadLag ?? 0
          const leadLagSummary =
            locale === 'ko'
              ? leadLag >= 0.18
                ? '구조 선행'
                : leadLag <= -0.18
                  ? '촉발 선행'
                  : '거의 동시'
              : leadLag >= 0.18
                ? 'structure ahead'
                : leadLag <= -0.18
                  ? 'trigger ahead'
                  : 'balanced'
          return {
            timescale,
            agreement: cell.agreement || 0,
            contradiction: cell.contradiction || 0,
            leadLag,
            summary:
              locale === 'ko'
                ? `${localizeTimescale(timescale, locale)}: 합의 ${agreementPct}% / 충돌 ${contradictionPct}% / ${leadLagSummary}`
                : `${localizeTimescale(timescale, locale)}: alignment ${agreementPct}% / conflict ${contradictionPct}% / ${leadLagSummary}`,
          }
        })
        .filter((cell): cell is AdapterMatrixViewCell => Boolean(cell))
      return {
        domain: row.domain,
        label: localizeDomain(row.domain, locale),
        cells,
      }
    })
}

export function buildBranchSet(
  core: DestinyCoreResult,
  locale: 'ko' | 'en'
): AdapterBranchCandidate[] {
  return (core.canonical.topScenarios || []).slice(0, 3).map((scenario) => ({
    id: scenario.id,
    label: formatScenarioBranchLabel(scenario.branch || scenario.id, locale),
    domain: scenario.domain,
    window: scenario.window,
    granularity: scenario.timingGranularity,
    summary:
      locale === 'ko'
        ? `${formatScenarioBranchLabel(scenario.branch || scenario.id, locale)} 경로는 ${localizeAdapterFreeText(scenario.window || 'now', locale)} 구간에서 가장 현실적입니다.`
        : `${formatScenarioBranchLabel(scenario.branch || scenario.id, locale)} is the most realistic path in the ${localizeAdapterFreeText(scenario.window || 'now', locale)} window.`,
    entry: (scenario.entryConditions || []).slice(0, 3).map((item) => localizeAdapterFreeText(item, locale)),
    abort: (scenario.abortConditions || []).slice(0, 3).map((item) => localizeAdapterFreeText(item, locale)),
    sustain: (scenario.sustainConditions || []).slice(0, 3).map((item) => localizeAdapterFreeText(item, locale)),
    reversalRisk: localizeAdapterFreeText(scenario.reversalRisk || '', locale),
    sustainability: scenario.sustainability,
    wrongMoveCost: localizeAdapterFreeText(scenario.wrongMoveCost || '', locale),
  }))
}

export function buildSingleUserModel(
  core: DestinyCoreResult,
  locale: 'ko' | 'en'
): AdapterSingleUserModel {
  const timingWindow =
    core.canonical.domainTimingWindows.find((item) => item.domain === core.canonical.actionFocusDomain) ||
    core.canonical.domainTimingWindows[0]
  const riskAxis = rankRiskAxis(core)
  const matrixLead = buildMatrixView(core, locale)[0]
  const facets = [
    {
      key: 'structure' as const,
      label: locale === 'ko' ? '구조' : 'Structure',
      summary:
        locale === 'ko'
          ? `${localizeDomain(core.canonical.focusDomain, locale)} 흐름이 배경에 깔려 있고 ${localizeDomain(core.canonical.actionFocusDomain, locale)} 쪽이 실제로 먼저 움직여야 할 영역입니다.`
          : `${localizeDomain(core.canonical.focusDomain, locale)} is the background structural axis, while ${localizeDomain(core.canonical.actionFocusDomain, locale)} is the front action axis.`,
      details: [
        buildArbitrationBrief(core, locale).focusNarrative,
        ...buildLatentTopAxes(core, locale).slice(0, 2).map((axis) => axis.label),
      ].filter(Boolean),
    },
    {
      key: 'cycle' as const,
      label: locale === 'ko' ? '주기' : 'Cycle',
      summary:
        locale === 'ko'
          ? `${localizeAdapterFreeText(timingWindow?.window || 'now', locale)} 구간이 현재 주기 중심입니다.`
          : `The ${localizeAdapterFreeText(timingWindow?.window || 'now', locale)} window is the current cycle center.`,
      details: buildTimingMatrix(core, locale)
        .slice(0, 2)
        .map((row) => row.summary)
        .filter(Boolean),
    },
    {
      key: 'trigger' as const,
      label: locale === 'ko' ? '촉발' : 'Trigger',
      summary:
        locale === 'ko'
          ? localizeAdapterFreeText(timingWindow?.timingConflictNarrative || '구조와 촉발을 함께 읽어야 합니다.', locale)
          : localizeAdapterFreeText(timingWindow?.timingConflictNarrative || 'Structure and trigger should be read together.', locale),
      details: (timingWindow?.entryConditions || []).slice(0, 2).map((item) => localizeAdapterFreeText(item, locale)),
    },
    {
      key: 'risk' as const,
      label: locale === 'ko' ? '리스크' : 'Risk',
      summary:
        locale === 'ko'
          ? `${localizeDomain(riskAxis, locale)} 문제가 가장 예민한 변수입니다.`
          : `${localizeDomain(riskAxis, locale)} is the most sensitive risk axis.`,
      details: [
        core.canonical.primaryCaution,
        core.canonical.riskControl,
      ].map((item) => localizeAdapterFreeText(item, locale)).filter(Boolean),
    },
    {
      key: 'action' as const,
      label: locale === 'ko' ? '행동' : 'Action',
      summary:
        locale === 'ko'
          ? `${getTopDecisionLabel(core, locale) || core.canonical.primaryAction}이 현재 실행 우선순위입니다.`
          : `${getTopDecisionLabel(core, locale) || core.canonical.primaryAction} is the current action priority.`,
      details: getAllowedActionLabels(core.canonical.judgmentPolicy.allowedActions, locale).slice(0, 3),
    },
    {
      key: 'calibration' as const,
      label: locale === 'ko' ? '보정' : 'Calibration',
      summary:
        locale === 'ko'
          ? `현재 신뢰도는 ${Math.round((core.canonical.confidence || 0) * 100)}% 수준이며, ${matrixLead ? `${matrixLead.label} 축의 matrix를 같이 봐야 합니다.` : '교차 합의도를 같이 봐야 합니다.'}`
          : `Current confidence is around ${Math.round((core.canonical.confidence || 0) * 100)}%, and ${matrixLead ? `${matrixLead.label} matrix should be read alongside it.` : 'cross-system agreement should be read alongside it.'}`,
      details: matrixLead?.cells.slice(0, 2).map((cell) => cell.summary) || [],
    },
  ]

  return {
    subject: locale === 'ko' ? '단일 주체 엔진' : 'Single-subject engine',
    facets,
  }
}

function formatScenarioBranchLabel(
  branch: string | undefined | null,
  locale: 'ko' | 'en'
): string {
  const raw = String(branch || '')
    .replace(/_/g, ' ')
    .trim()
  if (!raw) return locale === 'ko' ? '대안 경로' : 'alternate path'
  return localizeAdapterFreeText(raw, locale)
}

function buildBranchProjectionSummary(
  core: DestinyCoreResult,
  locale: 'ko' | 'en'
): AdapterProjectionBlock {
  const scenarios = (core.canonical.topScenarios || []).slice(0, 3)
  const branches = scenarios.map((scenario, index) => {
    const label = formatScenarioBranchLabel(scenario.branch || scenario.id, locale)
    const window = localizeAdapterFreeText(scenario.window || '', locale)
    const whyNow = localizeAdapterFreeText(scenario.whyNow || '', locale)
    const reversibility = scenario.reversible
      ? locale === 'ko'
        ? '되돌릴 여지가 남습니다'
        : 'it stays reversible'
      : locale === 'ko'
        ? '한 번 들어가면 되돌리기 어렵습니다'
        : 'it becomes hard to reverse once entered'
    return {
      summary:
        locale === 'ko'
          ? `${index + 1}안은 ${label} 쪽입니다. ${window ? `${window} 구간에서 ` : ''}${whyNow || '현재 조건이 맞으면 실제 사건축으로 붙습니다.'}`
          : `Path ${index + 1} leans toward ${label}. ${window ? `In the ${window} window, ` : ''}${whyNow || 'it becomes actionable when current conditions line up.'}`,
      driver: label,
      counterweight:
        locale === 'ko'
          ? `${reversibility} ${localizeAdapterFreeText(scenario.reversalRisk || '', locale)}`
          : `${reversibility} ${localizeAdapterFreeText(scenario.reversalRisk || '', locale)}`.trim(),
      nextMove:
        (scenario.sustainConditions || []).length > 0
          ? localizeAdapterFreeText(scenario.sustainConditions[0], locale)
          : (scenario.entryConditions || []).length > 0
          ? localizeAdapterFreeText(scenario.entryConditions[0], locale)
          : locale === 'ko'
            ? '진입 조건을 먼저 확인하세요.'
            : 'Check the entry condition first.',
      reason:
        locale === 'ko'
          ? `${label} 경로는 ${window || '현재'} 구간에서 ${reversibility} 잘못 움직이면 ${localizeAdapterFreeText(scenario.wrongMoveCost || '', locale)}가 커집니다.`
          : `${label} is strongest in ${window || 'the current'} window, ${reversibility}, and the wrong move cost is ${localizeAdapterFreeText(scenario.wrongMoveCost || '', locale)}.`,
    }
  })

  const summary =
    locale === 'ko'
      ? branches.length > 0
        ? `지금은 답이 하나로 고정되기보다 ${branches.length}개의 현실 경로가 동시에 열려 있습니다.`
        : '지금은 분기 경로를 더 지켜보며 조건을 모으는 편이 맞습니다.'
      : branches.length > 0
        ? `${branches.length} live branches are open right now rather than a single fixed outcome.`
        : 'It is better to gather conditions before locking into a single branch.'

  return {
    headline: locale === 'ko' ? '분기' : 'Branches',
    summary,
    detailLines: branches.map((item) => item.summary),
    drivers: branches.map((item) => item.driver).filter(Boolean),
    counterweights: branches.map((item) => item.counterweight).filter(Boolean),
    nextMoves: branches.map((item) => item.nextMove).filter(Boolean),
    reasons: branches.map((item) => item.reason).filter(Boolean),
    window: scenarios[0]?.window,
    granularity: scenarios[0]?.timingGranularity,
  }
}

function localizeLatentAxis(axisId: string, locale: 'ko' | 'en'): string {
  const ko: Record<string, string> = {
    readiness: '\uad6c\uc870 \uc900\ube44\ub3c4',
    trigger: '\ucd09\ubc1c \uc555\ub825',
    convergence: '\uad50\ucc28 \uc218\ub834\ub3c4',
    timing_reliability: '\ud0c0\uc774\ubc0d \uc2e0\ub8b0\ub3c4',
    timing_reversibility: '\ub418\ub3cc\ub9bc \uac00\ub2a5\uc131',
    timing_sustainability: '\ud0c0\uc774\ubc0d \uc9c0\uc18d\uc131',
    trigger_decay: '\ucd09\ubc1c \uac10\uc1e0',
    timing_consistency: '\ud0c0\uc774\ubc0d \uc77c\uad00\uc131',
    timing_window_width: '\ud0c0\uc774\ubc0d \ucc3d \ud3ed',
    activation_elasticity: '\ud65c\uc131 \ud0c4\ub825\uc131',
    intra_month_concentration: '\uc6d4\uc911 \uc9d1\uc911\ub3c4',
    timing_conflict: '\ud0c0\uc774\ubc0d \ucda9\ub3cc',
    focus_strength: '\uc911\uc2ec\ucd95 \uac15\ub3c4',
    action_focus_strength: '\ud589\ub3d9\ucd95 \uac15\ub3c4',
    decision_certainty: '\uacb0\uc815 \uc120\uba85\ub3c4',
    risk_control_intensity: '\ub9ac\uc2a4\ud06c \ud1b5\uc81c \uac15\ub3c4',
    career: '\ucee4\ub9ac\uc5b4 \uc555\ub825',
    relationship: '\uad00\uacc4 \uc555\ub825',
    wealth: '\uc7ac\uc815 \uc555\ub825',
    health: '\uac74\uac15 \uc555\ub825',
    move: '\uc774\ub3d9 \uc555\ub825',
    career_growth: '\ucee4\ub9ac\uc5b4 \uc131\uc7a5 \uc555\ub825',
    relationship_commitment: '\uad00\uacc4 \ud655\uc815 \uc555\ub825',
    wealth_leakage: '\uc7ac\uc815 \ub204\uc218 \uc555\ub825',
    health_recovery: '\uac74\uac15 \ud68c\ubcf5 \uc555\ub825',
    move_disruption: '\uc774\ub3d9 \uad50\ub780 \uc555\ub825',
    identity_rebuild: '\uc815\uccb4\uc131 \uc7ac\uad6c\uc131 \uc555\ub825',
    career_authority: '\ucee4\ub9ac\uc5b4 \uad8c\ud55c \uc555\ub825',
    relationship_repair: '\uad00\uacc4 \ud68c\ubcf5 \uc555\ub825',
    wealth_accumulation: '\uc7ac\uc815 \ucd95\uc801 \uc555\ub825',
    health_load: '\uac74\uac15 \ubd80\ud558 \uc555\ub825',
    move_opportunity: '\uc774\ub3d9 \uae30\ud68c \uc555\ub825',
    spiritual_opening: '\uc815\uc2e0\uc131 \uac1c\ubc29 \uc555\ub825',
    relation_harmony_density: '\uad00\uacc4 \uc870\ud654 \ubc00\ub3c4',
    relation_conflict_density: '\uad00\uacc4 \ucda9\ub3cc \ubc00\ub3c4',
    shinsal_density: '\uc2e0\uc0b4 \ubc00\ub3c4',
    supportive_cycle_alignment: '\ubcf4\uc870 \uc6b4 \ud750\ub984 \uc815\ub82c',
    cycle_cohesion: '\uc6b4 \ud750\ub984 \uc751\uc9d1\ub3c4',
    house_emphasis: '\ud558\uc6b0\uc2a4 \uac15\uc870\ub3c4',
    relational_capacity: '\uad00\uacc4 \uc218\uc6a9\ub825',
    support_resilience: '\uc9c0\uc9c0 \ud68c\ubcf5\ub825',
    draconic_support: '\ub4dc\ub77c\ucf54\ub2c9 \uc9c0\uc9c0',
    harmonic_resonance: '\ud558\ubaa8\ub2c9 \uacf5\uba85',
    fixed_star_pressure: '\uace0\uc815\uc131 \uc555\ub825',
    midpoint_activation: '\ubbf8\ub4dc\ud3ec\uc778\ud2b8 \ud65c\uc131',
    asteroid_signal_density: '\uc18c\ud589\uc131 \uc2e0\ud638 \ubc00\ub3c4',
    extra_point_density: '\ucd94\uac00 \ud3ec\uc778\ud2b8 \ubc00\ub3c4',
    return_stack_pressure: '\ub9ac\ud134 \uc911\ucca9 \uc555\ub825',
    aspect_cluster_density: '\uc560\uc2a4\ud399\ud2b8 \uad70\uc9d1 \ubc00\ub3c4',
    structure_trigger_mismatch: '\uad6c\uc870-\ucd09\ubc1c \ubd88\uc77c\uce58',
    opportunity_sustainability_gap: '\uae30\ud68c-\uc9c0\uc18d\uc131 \uac04\uadf9',
    focus_ambiguity: '\ucd08\uc810 \uacbd\uc7c1',
    evidence_fragmentation: '\uadfc\uac70 \ubd84\uc0b0',
    signal_competition: '\uc2e0\ud638 \uacbd\uc7c1',
    decision_reversal_risk: '\uacb0\uc815 \ubc18\uc804 \ub9ac\uc2a4\ud06c',
    timing_false_precision_risk: '\ud0c0\uc774\ubc0d \uacfc\uc815\ubc00 \ub9ac\uc2a4\ud06c',
    domain_polarization: '\ub3c4\uba54\uc778 \uc591\uadf9\ud654',
    evidence_mismatch_risk: '\uadfc\uac70 \ubd88\uc77c\uce58 \ub9ac\uc2a4\ud06c',
    cross_system_tension: '\uad50\ucc28 \uc2dc\uc2a4\ud15c \uae34\uc7a5',
    action_overreach_risk: '\ud589\ub3d9 \uacfc\uc2e0 \ub9ac\uc2a4\ud06c',
    evidence_cohesion: '\uadfc\uac70 \uc751\uc9d1\ub3c4',
    narrative_density: '\uc11c\uc0ac \ubc00\ub3c4',
    projection_clarity: '\ud22c\uc601 \uc120\uba85\ub3c4',
    explanation_depth: '\uc124\uba85 \uae4a\uc774',
    yongsin_alignment: '\uc6a9\uc2e0 \uc815\ub82c',
    saju_coverage: '\uc0ac\uc8fc \ud3ec\ucc29\ub3c4',
    advanced_astro_support: '\uace0\uae09 \uc810\uc131 \uc9c0\uc9c0',
    day_master_stability: '\uc77c\uac04 \uc548\uc815\uc131',
    long_cycle_support: '\uc7a5\uae30 \uc6b4 \uc9c0\uc9c0',
  }
  const en: Record<string, string> = {
    readiness: 'structural readiness',
    trigger: 'trigger pressure',
    convergence: 'cross convergence',
    timing_reliability: 'timing reliability',
    timing_reversibility: 'timing reversibility',
    timing_sustainability: 'timing sustainability',
    trigger_decay: 'trigger decay',
    timing_consistency: 'timing consistency',
    timing_window_width: 'timing window width',
    activation_elasticity: 'activation elasticity',
    intra_month_concentration: 'intra-month concentration',
    timing_conflict: 'timing conflict',
    focus_strength: 'focus strength',
    action_focus_strength: 'action focus strength',
    decision_certainty: 'decision certainty',
    risk_control_intensity: 'risk-control intensity',
    career: 'career pressure',
    relationship: 'relationship pressure',
    wealth: 'wealth pressure',
    health: 'health pressure',
    move: 'move pressure',
    career_growth: 'career growth pressure',
    relationship_commitment: 'relationship commitment pressure',
    wealth_leakage: 'wealth leakage pressure',
    health_recovery: 'health recovery pressure',
    move_disruption: 'move disruption pressure',
    identity_rebuild: 'identity rebuild pressure',
    career_authority: 'career authority pressure',
    relationship_repair: 'relationship repair pressure',
    wealth_accumulation: 'wealth accumulation pressure',
    health_load: 'health load pressure',
    move_opportunity: 'move opportunity pressure',
    spiritual_opening: 'spiritual opening pressure',
    relation_harmony_density: 'relationship harmony density',
    relation_conflict_density: 'relationship conflict density',
    shinsal_density: 'shinsal density',
    supportive_cycle_alignment: 'supportive cycle alignment',
    cycle_cohesion: 'cycle cohesion',
    house_emphasis: 'house emphasis',
    relational_capacity: 'relational capacity',
    support_resilience: 'support resilience',
    draconic_support: 'draconic support',
    harmonic_resonance: 'harmonic resonance',
    fixed_star_pressure: 'fixed-star pressure',
    midpoint_activation: 'midpoint activation',
    asteroid_signal_density: 'asteroid signal density',
    extra_point_density: 'extra-point density',
    return_stack_pressure: 'return-stack pressure',
    aspect_cluster_density: 'aspect-cluster density',
    structure_trigger_mismatch: 'structure-trigger mismatch',
    opportunity_sustainability_gap: 'opportunity-sustainability gap',
    focus_ambiguity: 'focus competition',
    evidence_fragmentation: 'evidence fragmentation',
    signal_competition: 'signal competition',
    decision_reversal_risk: 'decision reversal risk',
    timing_false_precision_risk: 'timing false-precision risk',
    domain_polarization: 'domain polarization',
    evidence_mismatch_risk: 'evidence mismatch risk',
    cross_system_tension: 'cross-system tension',
    action_overreach_risk: 'action overreach risk',
    evidence_cohesion: 'evidence cohesion',
    narrative_density: 'narrative density',
    projection_clarity: 'projection clarity',
    explanation_depth: 'explanation depth',
    yongsin_alignment: 'yongsin alignment',
    saju_coverage: 'saju coverage',
    advanced_astro_support: 'advanced astro support',
    day_master_stability: 'day-master stability',
    long_cycle_support: 'long-cycle support',
  }
  return (locale === 'ko' ? ko : en)[axisId] || axisId.replace(/_/g, ' ')
}

export function buildArbitrationBrief(
  core: DestinyCoreResult,
  locale: 'ko' | 'en' = 'en'
): AdapterArbitrationBrief {
  const focusWinnerDomain = core.canonical.arbitrationLedger.focusWinner.domain
  const actionWinnerDomain =
    core.canonical.arbitrationLedger.actionWinner?.domain || core.canonical.actionFocusDomain
  const focusRunnerUpDomain = core.canonical.arbitrationLedger.focusRunnerUp?.domain || null
  const actionRunnerUpDomain = core.canonical.arbitrationLedger.actionRunnerUp?.domain || null
  const suppressedDomains = core.canonical.arbitrationLedger.suppressedDomains || []

  return {
    focusWinnerDomain,
    focusWinnerReason: core.canonical.arbitrationLedger.focusWinner.reason,
    focusRunnerUpDomain,
    actionWinnerDomain,
    actionWinnerReason:
      core.canonical.arbitrationLedger.actionWinner?.reason ||
      `${core.canonical.actionFocusDomain} action lead came from fallback action selection`,
    actionRunnerUpDomain,
    conflictReasons: [...(core.canonical.arbitrationLedger.conflictReasons || [])],
    focusNarrative:
      locale === 'ko'
        ? focusRunnerUpDomain
          ? `${localizeDomain(focusWinnerDomain, locale)} 흐름이 ${localizeDomain(focusRunnerUpDomain, locale)}보다 앞서 이번 국면의 배경을 이끌고 있습니다.`
          : `${localizeDomain(focusWinnerDomain, locale)} 흐름이 이번 국면의 배경을 이끌고 있습니다.`
        : focusRunnerUpDomain
          ? `${focusWinnerDomain} stayed ahead of ${focusRunnerUpDomain} as the lead identity axis.`
          : `${focusWinnerDomain} remained the lead identity axis.`,
    actionNarrative:
      locale === 'ko'
        ? actionRunnerUpDomain
          ? `${localizeDomain(actionWinnerDomain, locale)} 쪽이 ${localizeDomain(actionRunnerUpDomain, locale)}보다 앞서 지금 실제로 먼저 움직여야 할 영역이 되었습니다.`
          : `${localizeDomain(actionWinnerDomain, locale)} 쪽이 지금 실제로 먼저 움직여야 할 영역입니다.`
        : actionRunnerUpDomain
          ? `${actionWinnerDomain} moved ahead of ${actionRunnerUpDomain} as the live action axis.`
          : `${actionWinnerDomain} is carrying the live action pressure.`,
    suppressionNarratives: suppressedDomains.map((item) =>
      locale === 'ko'
        ? `${localizeDomain(item.domain, locale)}은 ${item.scoreGap.toFixed(1)}점 차이로 보조축에 머물렀습니다. ${localizeAdapterFreeText(item.reason, locale)}`
        : `${item.domain} stayed secondary with a ${item.scoreGap.toFixed(1)} gap because ${item.reason}.`
    ),
  }
}

export function buildLatentTopAxes(core: DestinyCoreResult, locale: 'ko' | 'en'): AdapterLatentAxis[] {
  const axisGroupEntries = Object.entries(core.latentState?.groups || {}) as Array<
    [string, string[]]
  >
  return (core.latentState?.topAxes || []).slice(0, 8).map((axis) => ({
    id: axis.id,
    label: localizeLatentAxis(axis.id, locale),
    score: axis.value,
    group: axisGroupEntries.find(([, ids]) => ids.includes(axis.id))?.[0] || 'unknown',
  }))
}

export function buildProjectionSet(core: DestinyCoreResult, locale: 'ko' | 'en'): AdapterProjectionSet {
  const arbitrationBrief = buildArbitrationBrief(core, locale)
  const focusLabel = localizeDomain(core.canonical.focusDomain, locale)
  const actionLabel = localizeDomain(core.canonical.actionFocusDomain, locale)
  const riskAxisDomain = rankRiskAxis(core)
  const riskAxisLabel = localizeDomain(riskAxisDomain, locale)
  const timingMatrix = buildTimingMatrix(core, locale)
  const topAxes = buildLatentTopAxes(core, locale)
  const groupedTopAxes = (group: string, limit = 3) => {
    const groupAxisIds = ((core.latentState?.groups as Record<string, string[]> | undefined)?.[group] || []) as string[]
    return (core.latentState?.topAxes || [])
      .filter((axis) => groupAxisIds.includes(axis.id))
      .slice(0, limit)
      .map((axis) => localizeLatentAxis(axis.id, locale))
  }
  const timingWindow =
    core.canonical.domainTimingWindows.find(
      (item) => item.domain === core.canonical.actionFocusDomain
    ) || core.canonical.domainTimingWindows[0]
  const topSignals = core.canonical.topSignalIds.slice(0, 3)
  const topPatterns = core.canonical.topPatterns.slice(0, 2).map((item) => item.id)
  const topScenarios = core.canonical.topScenarios.slice(0, 2).map((item) => item.id)

  const structureSummary =
    locale === 'ko'
      ? core.canonical.actionFocusDomain !== core.canonical.focusDomain
        ? `지금 바로 다뤄야 할 영역은 ${actionLabel}이고, 삶의 배경 흐름은 ${focusLabel}입니다. 가장 조심해야 할 변수는 ${riskAxisLabel}이며 지금 판을 미는 층은 ${topAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}입니다.`
        : `지금 가장 크게 움직이는 흐름은 ${focusLabel}, 실제로 먼저 움직여야 할 영역은 ${actionLabel}, 가장 조심해야 할 변수는 ${riskAxisLabel}이며 지금 판을 미는 층은 ${topAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}입니다. ${arbitrationBrief.focusNarrative}`
      : core.canonical.actionFocusDomain !== core.canonical.focusDomain
        ? `The axis to handle directly right now is ${actionLabel}, while ${focusLabel} stays as the background structural axis. The risk axis is ${riskAxisLabel}, and the live drivers are ${topAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}.`
        : `The identity axis is ${focusLabel}, the action axis is ${actionLabel}, the risk axis is ${riskAxisLabel}, and the live drivers are ${topAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}. ${arbitrationBrief.focusNarrative}`

  const timingSummary =
    locale === 'ko'
      ? `${actionLabel} \uCABD \uD0C0\uC774\uBC0D\uC740 ${localizeAdapterFreeText(timingWindow?.window || 'unknown', locale)} \uAD6C\uAC04\uC73C\uB85C \uC77D\uD788\uBA70, ${localizeAdapterFreeText(timingWindow?.timingConflictNarrative || '\uAD6C\uC870\uC640 \uCD09\uBC1C\uC744 \uD568\uAED8 \uBD10\uC57C \uD569\uB2C8\uB2E4.', locale)}`
      : `Timing for ${actionLabel} reads as ${timingWindow?.window || 'unknown'}, and ${timingWindow?.timingConflictNarrative || 'structure and trigger need to be read together.'}`

  const conflictSummary =
    locale === 'ko'
      ? arbitrationBrief.actionNarrative || `${focusLabel} \uC911\uC2EC\uCD95\uACFC ${actionLabel} \uD589\uB3D9\uCD95\uC774 \uBD84\uB9AC\uB3FC \uC77D\uD788\uB294 \uAD6C\uAC04\uC785\uB2C8\uB2E4.`
      : arbitrationBrief.actionNarrative || `${focusLabel} and ${actionLabel} currently separate into identity and action axes.`

  const actionSummary =
    locale === 'ko'
      ? `${actionLabel} \uCD95\uC5D0\uC11C\uB294 ${getTopDecisionLabel(core, locale) || core.canonical.primaryAction}\uC774 \uC2E4\uC81C \uC6C0\uC9C1\uC784\uC758 \uC911\uC2EC\uC785\uB2C8\uB2E4. ${arbitrationBrief.actionNarrative}`
      : `On the ${actionLabel} axis, ${getTopDecisionLabel(core, locale) || core.canonical.primaryAction} is the live move. ${arbitrationBrief.actionNarrative}`

  const riskSummary = localizeAdapterFreeText(
    locale === 'ko'
      ? [core.canonical.primaryCaution, core.canonical.riskControl].filter(Boolean).join('. ')
      : `${core.canonical.primaryCaution} ${core.canonical.riskControl}`.trim(),
    locale
  )

  const evidenceSummary = buildEvidenceProjectionSummary(
    locale,
    topSignals,
    topPatterns,
    topScenarios
  )
  const timingGranularity = localizeAdapterFreeText(timingWindow?.timingGranularity || '', locale)
  const precisionReason = localizeAdapterFreeText(timingWindow?.precisionReason || '', locale)
  const timingConflictNarrative = localizeAdapterFreeText(
    timingWindow?.timingConflictNarrative || '',
    locale
  )
  const entryConditions = (timingWindow?.entryConditions || [])
    .slice(0, 3)
    .map((item) => localizeAdapterFreeText(item, locale))
    .filter(Boolean)
  const abortConditions = (timingWindow?.abortConditions || [])
    .slice(0, 3)
    .map((item) => localizeAdapterFreeText(item, locale))
    .filter(Boolean)
  const allowedActionLabels = getAllowedActionLabels(core.canonical.judgmentPolicy.allowedActions, locale)
  const blockedActionLabels = getBlockedActionLabels(core.canonical.judgmentPolicy.blockedActions, locale)
  const hardStopLabels = formatPolicyCheckLabels(core.canonical.judgmentPolicy.hardStops)
    .slice(0, 3)
    .map((item) => localizeAdapterFreeText(item, locale))
    .filter(Boolean)
  const softCheckLabels = formatPolicyCheckLabels(core.canonical.judgmentPolicy.softChecks)
    .slice(0, 3)
    .map((item) => localizeAdapterFreeText(item, locale))
    .filter(Boolean)
  const structuralDrivers =
    groupedTopAxes('structural').length > 0
      ? groupedTopAxes('structural', 4)
      : topAxes.slice(0, 4).map((axis) => axis.label)
  const evidenceReasons = buildEvidenceProjectionReasons(locale, topSignals, topPatterns, topScenarios)

  return {
    structure: {
      headline: locale === 'ko' ? '\uAD6C\uC870' : 'Structure',
      summary: structureSummary,
      detailLines: [
        locale === 'ko'
          ? core.canonical.actionFocusDomain !== core.canonical.focusDomain
            ? `${actionLabel} 쪽 설명이 지금 가장 앞에 와야 하고, ${focusLabel} 흐름은 배경으로 남아 있습니다.`
            : arbitrationBrief.focusNarrative
          : core.canonical.actionFocusDomain !== core.canonical.focusDomain
            ? `${actionLabel} is carrying the front-facing explanation right now, while ${focusLabel} remains the background structural axis.`
            : arbitrationBrief.focusNarrative,
        locale === 'ko'
          ? `지금 구조를 받치는 층은 ${structuralDrivers.join(', ')}입니다.`
          : `The live structural drivers are ${structuralDrivers.join(', ')}.`,
        locale === 'ko'
          ? `동시에 ${riskAxisLabel} 문제가 가장 예민한 변수로 같이 움직입니다.`
          : `At the same time, ${riskAxisLabel} is acting as the most sensitive risk axis.`,
      ].filter(Boolean),
      drivers: structuralDrivers,
      counterweights: arbitrationBrief.suppressionNarratives.slice(0, 3),
      nextMoves: [],
      topAxes: topAxes.slice(0, 4).map((axis) => axis.label),
      reasons: structuralDrivers.slice(0, 5),
    },
    timing: {
      headline: locale === 'ko' ? '\uD0C0\uC774\uBC0D' : 'Timing',
      summary: timingSummary,
      detailLines: [
        ...timingMatrix.slice(0, 3).map((item) => item.summary),
        precisionReason
          ? locale === 'ko'
            ? `정밀도 기준은 ${precisionReason}입니다.`
            : `The precision cap is ${precisionReason}.`
          : '',
        timingConflictNarrative,
      ].filter(Boolean),
      drivers: groupedTopAxes('timing', 4),
      counterweights: abortConditions,
      nextMoves: entryConditions,
      window: timingWindow?.window,
      granularity: timingGranularity || timingWindow?.timingGranularity,
      reasons: [
        ...groupedTopAxes('timing', 3),
        timingGranularity || localizeAdapterFreeText(timingWindow?.timingGranularity || 'unknown', locale),
        precisionReason,
        localizeAdapterFreeText(timingWindow?.timingConflictMode || '', locale),
      ].filter(Boolean).slice(0, 5),
    },
    conflict: {
      headline: locale === 'ko' ? '\uCDA9\uB3CC' : 'Conflict',
      summary: localizeAdapterFreeText(conflictSummary, locale),
      detailLines: [
        ...arbitrationBrief.suppressionNarratives.slice(0, 2),
      ].filter(Boolean),
      drivers: groupedTopAxes('conflict', 4),
      counterweights: arbitrationBrief.suppressionNarratives.slice(0, 3),
      nextMoves: softCheckLabels,
      reasons: [
        ...groupedTopAxes('conflict', 3),
        ...core.canonical.arbitrationLedger.conflictReasons
          .slice(0, 3)
          .map((item) => localizeAdapterFreeText(item, locale)),
        ...arbitrationBrief.suppressionNarratives.slice(0, 2),
      ].filter(Boolean).slice(0, 5),
    },
    action: {
      headline: locale === 'ko' ? '\uD589\uB3D9' : 'Action',
      summary: localizeAdapterFreeText(actionSummary, locale),
      detailLines: [
        localizeAdapterFreeText(core.canonical.judgmentPolicy.rationale, locale),
      ].filter(Boolean),
      drivers: [...groupedTopAxes('domain', 3), ...allowedActionLabels.slice(0, 2)].filter(Boolean),
      counterweights: [...blockedActionLabels.slice(0, 2), ...hardStopLabels.slice(0, 2)].filter(Boolean),
      nextMoves: [...allowedActionLabels.slice(0, 2), ...softCheckLabels.slice(0, 2)].filter(Boolean),
      reasons: [
        ...groupedTopAxes('domain', 3),
        getTopDecisionLabel(core, locale) || '',
        ...allowedActionLabels.slice(0, 2),
      ].filter(Boolean).slice(0, 5),
    },
    risk: {
      headline: locale === 'ko' ? '\uB9AC\uC2A4\uD06C' : 'Risk',
      summary: riskSummary,
      detailLines: [
        locale === 'ko'
          ? `지금 가장 먼저 지켜봐야 할 변수는 ${riskAxisLabel}입니다.`
          : `The axis to monitor first right now is ${riskAxisLabel}.`,
        ...hardStopLabels.slice(0, 2),
      ].filter(Boolean),
      drivers: [...groupedTopAxes('conflict', 2), ...blockedActionLabels.slice(0, 2)].filter(Boolean),
      counterweights: hardStopLabels,
      nextMoves: softCheckLabels,
      reasons: [
        ...groupedTopAxes('conflict', 2),
        ...blockedActionLabels.slice(0, 2),
        ...hardStopLabels.slice(0, 2),
      ].filter(Boolean).slice(0, 5),
    },
    evidence: {
      headline: locale === 'ko' ? '\uADFC\uAC70' : 'Evidence',
      summary: localizeAdapterFreeText(evidenceSummary, locale),
      detailLines: [...evidenceReasons].filter(Boolean),
      drivers: [
        ...groupedTopAxes('astrology', 2),
        ...groupedTopAxes('narrative', 2),
        ...evidenceReasons.slice(0, 2),
      ].filter(Boolean),
      counterweights: [],
      nextMoves: [],
      reasons: [
        ...groupedTopAxes('astrology', 2),
        ...groupedTopAxes('narrative', 2),
        ...evidenceReasons,
      ].filter(Boolean).slice(0, 6),
    },
    branches: buildBranchProjectionSummary(core, locale),
  }
}

