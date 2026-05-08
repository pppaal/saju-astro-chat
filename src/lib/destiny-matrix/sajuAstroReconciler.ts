// src/lib/destiny-matrix/sajuAstroReconciler.ts
//
// 사주↔점성 같은-fact 충돌 해소 reconciler.
//
// 동일 도메인(예: 자아 강도, 관계 운, 재물 흐름)에 대해 사주가 X라고
// 하고 점성이 ¬X 라고 할 때, 어떤 신호를 우선할지 정통 가중치 룰로
// 결정. LLM에 던지기 전에 deterministic 우선순위를 매겨서 "양면성으로
// 처리"가 아닌 "이게 무게 중심"이라고 명시.

export type Domain = 'self' | 'love' | 'money' | 'career' | 'health' | 'family'

export interface SajuFact {
  domain: Domain
  /** 신호 강도 +1.0 (강한 긍정) ~ -1.0 (강한 부정) */
  polarity: number
  /** 정통 가중치 — 격국·용신 일치는 1.0, 단순 십성 카운트는 0.4 */
  authority: number
  source: string  // '격국 정인격 + 용신 화 운', '천간충 乙-辛' 등
}

export interface AstroFact {
  domain: Domain
  polarity: number
  authority: number
  source: string  // 'Sun in Aquarius detriment', 'Profection 7H lord bonified' 등
}

export interface ReconciledSignal {
  domain: Domain
  /** 최종 단일 polarity (-1 ~ +1) */
  resolvedPolarity: number
  /** 어느 시스템이 우세한지 */
  dominantSystem: 'saju' | 'astro' | 'tied'
  /** 충돌이 있었는지 */
  hadConflict: boolean
  /** 사용자 친화 narrative */
  narrative: string
  contributingFacts: { saju: SajuFact[]; astro: AstroFact[] }
}

/**
 * 정통 시스템 가중치 룰:
 *   - 격국·용신 명시 fact는 사주 1.2배
 *   - profection year-lord / ZR peak / sect bonification은 점성 1.2배
 *   - 둘 다 권위 있을 땐 polarity 평균
 *   - 권위 차이 0.2 이상이면 우세 시스템 따라감
 *   - 양 시스템 polarity 부호 다르면 hadConflict=true, narrative에 양면 명시
 */
export function reconcile(
  sajuFacts: SajuFact[],
  astroFacts: AstroFact[],
): ReconciledSignal[] {
  const domains: Domain[] = ['self', 'love', 'money', 'career', 'health', 'family']
  const out: ReconciledSignal[] = []

  for (const domain of domains) {
    const sajuD = sajuFacts.filter((f) => f.domain === domain)
    const astroD = astroFacts.filter((f) => f.domain === domain)
    if (sajuD.length === 0 && astroD.length === 0) continue

    const sajuWeighted = weightedPolarity(sajuD)
    const astroWeighted = weightedPolarity(astroD)

    const hadConflict =
      sajuWeighted.weight > 0 &&
      astroWeighted.weight > 0 &&
      Math.sign(sajuWeighted.polarity) !== Math.sign(astroWeighted.polarity) &&
      Math.abs(sajuWeighted.polarity) > 0.2 &&
      Math.abs(astroWeighted.polarity) > 0.2

    let resolvedPolarity: number
    let dominantSystem: 'saju' | 'astro' | 'tied'
    if (sajuWeighted.weight === 0 && astroWeighted.weight > 0) {
      resolvedPolarity = astroWeighted.polarity
      dominantSystem = 'astro'
    } else if (astroWeighted.weight === 0 && sajuWeighted.weight > 0) {
      resolvedPolarity = sajuWeighted.polarity
      dominantSystem = 'saju'
    } else {
      const totalWeight = sajuWeighted.weight + astroWeighted.weight
      resolvedPolarity =
        (sajuWeighted.polarity * sajuWeighted.weight + astroWeighted.polarity * astroWeighted.weight) /
        totalWeight
      const diff = Math.abs(sajuWeighted.weight - astroWeighted.weight) / totalWeight
      if (diff < 0.15) dominantSystem = 'tied'
      else dominantSystem = sajuWeighted.weight > astroWeighted.weight ? 'saju' : 'astro'
    }

    const narrative = buildNarrative({
      domain,
      sajuFacts: sajuD,
      astroFacts: astroD,
      resolvedPolarity,
      dominantSystem,
      hadConflict,
    })

    out.push({
      domain,
      resolvedPolarity: Math.max(-1, Math.min(1, resolvedPolarity)),
      dominantSystem,
      hadConflict,
      narrative,
      contributingFacts: { saju: sajuD, astro: astroD },
    })
  }

  return out
}

function weightedPolarity(facts: { polarity: number; authority: number }[]): {
  polarity: number
  weight: number
} {
  if (facts.length === 0) return { polarity: 0, weight: 0 }
  let totalSigned = 0
  let totalWeight = 0
  for (const f of facts) {
    const w = Math.max(0.1, Math.min(1.5, f.authority))
    totalSigned += f.polarity * w
    totalWeight += w
  }
  return {
    polarity: totalWeight > 0 ? totalSigned / totalWeight : 0,
    weight: totalWeight,
  }
}

function buildNarrative(input: {
  domain: Domain
  sajuFacts: SajuFact[]
  astroFacts: AstroFact[]
  resolvedPolarity: number
  dominantSystem: 'saju' | 'astro' | 'tied'
  hadConflict: boolean
}): string {
  const domainKo: Record<Domain, string> = {
    self: '자아', love: '관계', money: '재물', career: '커리어', health: '건강', family: '가족',
  }
  const polLabel =
    input.resolvedPolarity > 0.5
      ? '강한 긍정'
      : input.resolvedPolarity > 0.15
        ? '약한 긍정'
        : input.resolvedPolarity < -0.5
          ? '강한 부정'
          : input.resolvedPolarity < -0.15
            ? '약한 부정'
            : '중립'

  const dominantLabel =
    input.dominantSystem === 'saju'
      ? '사주 우세'
      : input.dominantSystem === 'astro'
        ? '점성 우세'
        : '양 시스템 동률'

  const head = `${domainKo[input.domain]}: ${polLabel} (${dominantLabel})`

  if (input.hadConflict) {
    const sajuTop = input.sajuFacts.sort((a, b) => Math.abs(b.polarity * b.authority) - Math.abs(a.polarity * a.authority))[0]
    const astroTop = input.astroFacts.sort((a, b) => Math.abs(b.polarity * b.authority) - Math.abs(a.polarity * a.authority))[0]
    return `${head} — 사주(${sajuTop?.source})와 점성(${astroTop?.source})이 다른 방향. ${input.dominantSystem === 'saju' ? '사주' : '점성'} 신호의 권위가 더 커서 그 결로 정렬했지만, 반대 시스템 신호도 양면으로 살아 있음.`
  }

  const sajuSummary = input.sajuFacts
    .slice(0, 2)
    .map((f) => f.source)
    .join(', ')
  const astroSummary = input.astroFacts
    .slice(0, 2)
    .map((f) => f.source)
    .join(', ')
  const support = [sajuSummary, astroSummary].filter(Boolean).join(' + ')
  return `${head} — ${support}`
}
