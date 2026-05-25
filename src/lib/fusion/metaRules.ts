// Meta-rules: detect cross-domain themes from per-domain aggregates.
// Run AFTER the regular rule pass.
//
// Threshold philosophy:
// - 단순 tone 기반 발화는 헐거움 → 강도 조건을 같이 본다.
// - 모든 임계값은 META_THRESHOLDS 객체로 모아 외부 calibration 가능.

import type { Domain, DomainAggregate, MetaRule } from './types'

// 외부에서 calibration 가능한 메타룰 임계값.
// - 운영 데이터 누적 후 통계적으로 보정할 때 이 객체만 갱신하면 모든 룰이 따라옴.
export interface MetaThresholds {
  /** strongNegative: minimum count of strong/moderate negative confirms or conflicts. */
  strongNegativeMinSignals: number
  /** strongPositive: requires at least one strong confirm. */
  strongPositiveRequiresStrongConfirm: boolean
  /** strongMixed: tone === 'mixed' AND has at least one strong intensity match. */
  strongMixedRequiresStrongIntensity: boolean
  /** anyStrongConfirm: minimum count of strong confirms. */
  anyStrongConfirmMin: number
}

export const DEFAULT_META_THRESHOLDS: MetaThresholds = {
  strongNegativeMinSignals: 2,
  strongPositiveRequiresStrongConfirm: true,
  strongMixedRequiresStrongIntensity: true,
  anyStrongConfirmMin: 1,
}

let activeThresholds: MetaThresholds = { ...DEFAULT_META_THRESHOLDS }
export function setMetaThresholds(t: Partial<MetaThresholds>): void {
  activeThresholds = { ...activeThresholds, ...t }
}
export function getMetaThresholds(): MetaThresholds {
  return { ...activeThresholds }
}
export function resetMetaThresholds(): void {
  activeThresholds = { ...DEFAULT_META_THRESHOLDS }
}

const has = (
  byDomain: Record<Domain, DomainAggregate>,
  domain: Domain,
  pred: (b: DomainAggregate) => boolean
) => pred(byDomain[domain])

// 실제 강한 부정 신호가 있는가? (단순 mixed tone만으론 부족)
const strongNegative = (b: DomainAggregate) => {
  const t = activeThresholds
  const negativeStrong = b.confirms.some(
    (m) => m.rule.polarityHint === 'neg' && (m.intensity === 'strong' || m.intensity === 'moderate')
  )
  if (negativeStrong) return true
  const conflictStrong = b.conflicts.filter(
    (m) => m.intensity === 'strong' || m.intensity === 'moderate'
  ).length
  return conflictStrong >= t.strongNegativeMinSignals
}

const strongPositive = (b: DomainAggregate) => {
  const t = activeThresholds
  if (b.tone !== 'positive') return false
  if (!t.strongPositiveRequiresStrongConfirm) return true
  return b.confirms.some((m) => m.intensity === 'strong')
}

const strongMixed = (b: DomainAggregate) => {
  const t = activeThresholds
  if (b.tone !== 'mixed') return false
  if (!t.strongMixedRequiresStrongIntensity) return true
  return (
    b.conflicts.some((m) => m.intensity === 'strong') ||
    b.confirms.some((m) => m.intensity === 'strong')
  )
}

const anyStrongConfirm = (b: DomainAggregate) =>
  b.confirms.filter((m) => m.intensity === 'strong').length >= activeThresholds.anyStrongConfirmMin

export const metaRules: MetaRule[] = [
  {
    id: 'theme.relational-financial-strain',
    meaning: '관계×재물 동시 압박',
    narrative:
      '사랑·재물 두 영역에서 동시에 강한 부정 신호가 모임 — 분리·분할·재산 분쟁의 잠재 시기. 큰 결정은 보류 권장.',
    narrativeEn:
      'Strong negative signals gather in both love and money — a potential window for separation, division, or financial disputes. Hold off on big decisions.',
    detect: (d) => has(d, 'love', strongNegative) && has(d, 'money', strongNegative),
  },
  {
    id: 'theme.career-health-tradeoff',
    meaning: '성취×건강 트레이드오프',
    narrative:
      '직업·성취 영역의 강한 활성과 건강 영역의 위축이 겹침 — 성과의 대가로 신체·수면이 깎이는 시기.',
    narrativeEn:
      'High activation in career and achievement overlaps with a dip in health — a season where results are paid for in body and sleep.',
    detect: (d) => has(d, 'career', strongPositive) && has(d, 'health', strongNegative),
  },
  {
    id: 'theme.identity-shift',
    meaning: '자아 재정의 국면',
    narrative:
      '자아·관계가 동시에 강하게 흔들림 — 정체성의 외피와 거울이 같이 변하는 전환기. 새 자기 정의의 호기.',
    narrativeEn:
      'Self and relationships shake strongly at once — a transition where your outer identity and your mirror change together. A prime time to redefine yourself.',
    // 이전엔 self mixed + love !=neutral 이었음 → 너무 헐거움.
    // 둘 다 강한 mixed 또는 강한 conflict가 있을 때만 발화.
    detect: (d) => strongMixed(d.self) && strongMixed(d.love),
  },
  {
    id: 'theme.expansion-window',
    meaning: '확장의 창',
    narrative:
      '재물·직업·자아가 모두 양호하고 강한 confirm이 다수 — 외부 활동·확장·계약에 유리한 드문 시기. 실행 우선.',
    narrativeEn:
      'Money, career, and self are all sound with many strong confirmations — a rare window favoring outward action, expansion, and deals. Prioritize execution.',
    detect: (d) =>
      has(d, 'money', strongPositive) &&
      has(d, 'career', strongPositive) &&
      (d.self.tone === 'positive' || d.self.tone === 'neutral'),
  },
  {
    id: 'theme.family-roots-call',
    meaning: '뿌리로의 회귀',
    narrative:
      '가정·자아 영역에 강한 신호가 동시 — 원가족·고향·뿌리 관련 사건/감정이 표면화되는 시기.',
    narrativeEn:
      'Strong signals in home and self together — a season when family-of-origin, hometown, and roots surface in both events and feelings.',
    detect: (d) => anyStrongConfirm(d.family) && (anyStrongConfirm(d.self) || strongMixed(d.self)),
  },
  {
    id: 'theme.solo-ascent',
    meaning: '독립 상승',
    narrative: '자아·직업 양호 + 관계 영역은 잠잠 — 혼자 추진하는 일·독립 프로젝트에 유리한 시기.',
    narrativeEn:
      'Self and career are sound while relationships stay quiet — a season that favors solo-driven work and independent projects.',
    detect: (d) => strongPositive(d.self) && strongPositive(d.career) && d.love.tone === 'neutral',
  },
  {
    id: 'theme.foundation-rebuild',
    meaning: '기반 재구축',
    narrative:
      '가정·재물 영역에 강한 부정 신호 동시 — 살림·기반 재정비의 시기. 외부 확장보다 내부 정리가 효과적.',
    narrativeEn:
      'Strong negative signals in home and money together — a time to rebuild your base. Internal restructuring beats outward expansion.',
    detect: (d) => has(d, 'family', strongNegative) && has(d, 'money', strongNegative),
  },
  {
    id: 'theme.creative-flow',
    meaning: '창조 흐름',
    narrative:
      '직업·자아·사랑 영역에 부드러운 신호가 함께 — 창작·표현·관계 통합이 자연스럽게 흐르는 호기.',
    narrativeEn:
      'Soft signals run together across career, self, and love — a window where creation, expression, and relational integration flow naturally.',
    detect: (d) =>
      strongPositive(d.career) &&
      d.self.tone !== 'negative' &&
      d.love.tone !== 'negative' &&
      d.career.confirms.some(
        (m) => m.rule.meaning.includes('표현') || m.rule.meaning.includes('창조')
      ),
  },
  {
    id: 'theme.duty-overload',
    meaning: '책임 과부하',
    narrative: '직업·자아 모두 강한 부정 신호 — 책임은 늘고 자원은 감소. 위임·우선순위 정리 권장.',
    narrativeEn:
      'Strong negative signals in both career and self — responsibility rises while resources fall. Delegate and reset priorities.',
    detect: (d) => has(d, 'career', strongNegative) && has(d, 'self', strongNegative),
  },
  {
    id: 'theme.harvest-season',
    meaning: '수확기',
    narrative:
      '재물·가정·자아 모두 강한 안정 신호 — 그동안의 노력이 결실로 돌아오는 안정기. 확산보다 누림이 적기.',
    narrativeEn:
      'Strong stable signals across money, home, and self — a settled season when past effort returns as harvest. A time to enjoy rather than expand.',
    detect: (d) => strongPositive(d.money) && strongPositive(d.family) && strongPositive(d.self),
  },
]
