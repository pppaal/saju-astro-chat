import type { CoreCoherenceAudit, CoreDecisionLead, CoreDomainVerdict, CoreJudgmentPolicy } from './types'

export const MODE_RANK: Record<CoreJudgmentPolicy['mode'], number> = {
  prepare: 0,
  verify: 1,
  execute: 2,
}

export const RANK_MODE: Record<number, CoreJudgmentPolicy['mode']> = {
  0: 'prepare',
  1: 'verify',
  2: 'execute',
}

export const DOMAIN_ARBITRATION_RULES: Record<
  string,
  {
    minMode: CoreJudgmentPolicy['mode']
    commitThreshold: number
    forceBlockCommitOnRiskFamily?: boolean
    forceVerificationWhenIrreversible?: boolean
  }
> = {
  career: {
    minMode: 'verify',
    commitThreshold: 0.72,
    forceVerificationWhenIrreversible: true,
  },
  relationship: {
    minMode: 'verify',
    commitThreshold: 0.78,
    forceBlockCommitOnRiskFamily: true,
  },
  wealth: {
    minMode: 'verify',
    commitThreshold: 0.8,
    forceBlockCommitOnRiskFamily: true,
    forceVerificationWhenIrreversible: true,
  },
  health: {
    minMode: 'prepare',
    commitThreshold: 0.99,
    forceBlockCommitOnRiskFamily: true,
  },
  move: {
    minMode: 'verify',
    commitThreshold: 0.82,
    forceVerificationWhenIrreversible: true,
  },
  timing: {
    minMode: 'verify',
    commitThreshold: 0.99,
  },
  personality: {
    minMode: 'verify',
    commitThreshold: 0.86,
  },
  spirituality: {
    minMode: 'verify',
    commitThreshold: 0.88,
  },
}

export function downgradeMode(
  current: CoreJudgmentPolicy['mode'],
  next: CoreJudgmentPolicy['mode']
): CoreJudgmentPolicy['mode'] {
  return RANK_MODE[Math.min(MODE_RANK[current], MODE_RANK[next])]
}

export function uniqueActions(
  actions: Array<
    | 'commit_now'
    | 'staged_commit'
    | 'prepare_only'
    | 'review_first'
    | 'negotiate_first'
    | 'boundary_first'
    | 'pilot_first'
    | 'route_recheck_first'
    | 'lease_review_first'
    | 'basecamp_reset_first'
  >
) {
  return [...new Set(actions)]
}

export function buildCanonicalPolicyLine(input: {
  lang: 'ko' | 'en'
  key:
    | 'gated_top_decision'
    | 'low_cross_agreement'
    | 'defensive_reset_priority'
    | 'verification_step'
  topDecision?: CoreDecisionLead | null
}): string {
  if (input.key === 'gated_top_decision') {
    return (
      input.topDecision?.gateReason ||
      (input.lang === 'ko'
        ? '상위 결정안이 게이트에 걸려 즉시 확정은 차단됩니다.'
        : 'The top decision path is gated, so immediate commitment is blocked.')
    )
  }
  if (input.key === 'low_cross_agreement') {
    return input.lang === 'ko'
      ? '교차 합의도가 낮아 확정형 해석보다 조건부 실행이 우선입니다.'
      : 'Cross-agreement is too low for hard commitment; conditional execution comes first.'
  }
  if (input.key === 'defensive_reset_priority') {
    return input.lang === 'ko'
      ? '현재 국면에서는 새 확장보다 방어와 재정렬이 우선입니다.'
      : 'The current phase prioritizes defense and reset over fresh expansion.'
  }
  return input.lang === 'ko'
    ? '실행 전 확인 절차를 생략하지 마세요.'
    : 'Do not skip the verification step before execution.'
}

export function buildCoherenceNote(input: {
  lang: 'ko' | 'en'
  key:
    | 'verification_bias'
    | 'gated_defer'
    | 'conditional_execution'
    | 'aligned_domains'
}): string {
  if (input.key === 'verification_bias') {
    return input.lang === 'ko'
      ? '현재 판단은 확정보다 검증 편향이 우선인 구조입니다.'
      : 'Current judgment is in verification-biased mode rather than direct commitment mode.'
  }
  if (input.key === 'gated_defer') {
    return input.lang === 'ko'
      ? '상위 결정안에 게이트가 걸려 있어 즉시 확정보다 보류가 더 안전합니다.'
      : 'The top decision path is gated, so immediate commitment should be deferred.'
  }
  if (input.key === 'conditional_execution') {
    return input.lang === 'ko'
      ? '교차 합의도가 낮아 단정보다 조건부 실행이 더 적합합니다.'
      : 'Cross-agreement is low, so conditional execution is safer than hard conclusions.'
  }
  return input.lang === 'ko'
    ? '상위 도메인 신호가 비교적 한 방향으로 정렬돼 있습니다.'
    : 'Lead-domain signals are relatively aligned in one direction.'
}

export function buildJudgmentPolicy(input: {
  lang: 'ko' | 'en'
  coherenceAudit: CoreCoherenceAudit
  topDecision: CoreDecisionLead | null
  phase: string
  confidence: number
  crossAgreement: number | null
  primaryCaution: string
  riskControl: string
  focusDomainVerdict: CoreDomainVerdict | null
}): CoreJudgmentPolicy {
  const hardStops: string[] = []
  const softChecks: string[] = []

  if (input.coherenceAudit.gatedDecision) {
    hardStops.push(buildCanonicalPolicyLine({
      lang: input.lang,
      key: 'gated_top_decision',
      topDecision: input.topDecision,
    }))
  }

  if (input.crossAgreement !== null && input.crossAgreement < 0.35) {
    hardStops.push(buildCanonicalPolicyLine({ lang: input.lang, key: 'low_cross_agreement' }))
  }

  if (
    input.phase === 'defensive_reset' ||
    input.confidence < 0.42 ||
    input.coherenceAudit.domainConflictCount >= 2
  ) {
    hardStops.push(buildCanonicalPolicyLine({ lang: input.lang, key: 'defensive_reset_priority' }))
  }

  if (input.riskControl) softChecks.push(input.riskControl)
  if (input.primaryCaution) softChecks.push(input.primaryCaution)
  if (input.coherenceAudit.verificationBias) {
    softChecks.push(buildCanonicalPolicyLine({ lang: input.lang, key: 'verification_step' }))
  }

  let mode: CoreJudgmentPolicy['mode'] =
    hardStops.length > 0
      ? 'prepare'
      : input.coherenceAudit.verificationBias || input.phase === 'expansion_guarded'
        ? 'verify'
        : 'execute'

  if (input.focusDomainVerdict) {
    mode = downgradeMode(mode, input.focusDomainVerdict.mode)
  }

  let allowedActions =
    mode === 'execute'
      ? uniqueActions([
          'commit_now',
          'staged_commit',
          'review_first',
          'negotiate_first',
          'boundary_first',
          'pilot_first',
          'route_recheck_first',
          'lease_review_first',
          'basecamp_reset_first',
          'prepare_only',
        ])
      : mode === 'verify'
        ? uniqueActions([
            'staged_commit',
            'review_first',
            'negotiate_first',
            'boundary_first',
            'pilot_first',
            'route_recheck_first',
            'lease_review_first',
            'basecamp_reset_first',
            'prepare_only',
          ])
        : uniqueActions(['prepare_only'])

  if (input.focusDomainVerdict) {
    allowedActions = uniqueActions(
      allowedActions.filter((action) => input.focusDomainVerdict?.allowedActions.includes(action))
    )
    if (allowedActions.length === 0) {
      allowedActions = [...input.focusDomainVerdict.allowedActions]
    }
  }

  const blockedActions = uniqueActions(
    (
      [
        'commit_now',
        'staged_commit',
        'prepare_only',
        'review_first',
        'negotiate_first',
        'boundary_first',
        'pilot_first',
        'route_recheck_first',
        'lease_review_first',
        'basecamp_reset_first',
      ] as const
    ).filter((action) => !allowedActions.includes(action))
  )

  const rationale =
    input.focusDomainVerdict?.rationale ||
    (input.lang === 'ko'
      ? mode === 'execute'
        ? '현재는 실행 가능한 조건이 갖춰진 구간입니다.'
        : mode === 'verify'
          ? '현재는 실행보다 검토와 재확인이 더 적합한 구간입니다.'
          : '현재는 준비와 정리가 우선인 구간입니다.'
      : mode === 'execute'
        ? 'Current conditions support execution.'
        : mode === 'verify'
          ? 'Current conditions favor review and recheck before execution.'
          : 'Current conditions favor preparation and reset first.')

  return {
    mode,
    allowedActions,
    blockedActions,
    hardStops: [...new Set(hardStops)],
    softChecks: [...new Set(softChecks)].slice(0, 4),
    rationale,
  }
}
