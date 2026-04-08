export function formatDecisionActionLabel(
  action: string | undefined | null,
  locale: 'ko' | 'en',
  soften = false
): string {
  if (!action) return ''

  const koMap: Record<string, string> = {
    commit_now: soften
      ? '바로 확정하지 말고 최종 확인을 거치세요.'
      : '확정 단계까지 밀어도 되는 흐름입니다.',
    staged_commit: '단계를 나눠 합의하고 중간 점검을 끼워 넣으세요.',
    prepare_only: '지금은 준비와 정보 수집에 집중하세요.',
    review_first: '결론보다 검토 기준과 보류 조건을 먼저 정리하세요.',
    negotiate_first: '범위·조건·기한을 먼저 조율한 뒤 다음 단계로 가세요.',
    boundary_first: '관계와 책임 경계를 먼저 정리한 뒤 움직이세요.',
    pilot_first: '작게 시험하고 첫 검증 결과를 본 뒤 넓히세요.',
    route_recheck_first: '후보 경로와 생활 동선을 먼저 비교하세요.',
    lease_review_first: '계약 조건을 먼저 재확인하고 필요한 부분을 다시 협의하세요.',
    basecamp_reset_first: '큰 이동보다 생활 거점과 운영 방식을 먼저 재정비하세요.',
  }

  const enMap: Record<string, string> = {
    commit_now: soften
      ? 'Avoid instant commitment; run a final verification step.'
      : 'Conditions support a direct commitment.',
    staged_commit: 'Break the move into stages and insert a checkpoint.',
    prepare_only: 'Stay in preparation and information-gathering mode.',
    review_first: 'Define review criteria and hold conditions before committing.',
    negotiate_first: 'Negotiate scope, terms, and timing before you lock it in.',
    boundary_first: 'Set boundaries and ownership before you proceed.',
    pilot_first: 'Run a pilot first and expand after the first proof loop.',
    route_recheck_first: 'Compare the route, commute, and daily path first.',
    lease_review_first: 'Review the lease terms, cost, and timing first.',
    basecamp_reset_first: 'Reset the base of operations before the larger move.',
  }

  return locale === 'ko' ? koMap[action] || action : enMap[action] || action
}

export function formatDecisionActionLabels(
  actions: Array<string | undefined | null> | undefined,
  locale: 'ko' | 'en',
  soften = false
): string[] {
  return (actions || [])
    .map((action) => formatDecisionActionLabel(action, locale, soften))
    .filter(Boolean)
}

export function formatPolicyCheckLabels(
  checks: Array<string | undefined | null> | undefined
): string[] {
  return [
    ...new Set(
      (checks || [])
        .map((item) =>
          String(item || '')
            .replace(/\s+/g, ' ')
            .trim()
        )
        .filter(Boolean)
    ),
  ]
}
