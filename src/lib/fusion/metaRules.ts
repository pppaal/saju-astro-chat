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

// 순서 = 카르마에서 themes[0] 우선순위. 보편·정체성형 주제를 앞에 두어 가장
// 부정적인 주제가 항상 먼저 노출되지 않게 한다. 내러티브는 "라이프 패턴"
// 어투(특정 시기/조언 imperative 배제)로 카르마 맥락에 맞춘다.
export const metaRules: MetaRule[] = [
  {
    id: 'theme.harvest-season',
    meaning: '여무는 결',
    narrative: '재물·가정·자아가 함께 여무는 결이 있어, 쌓아온 것을 누리고 거두는 힘이 강해요.',
    narrativeEn:
      'Money, home, and self ripen together — you carry a strong gift for reaping and enjoying what you have built.',
    detect: (d) => strongPositive(d.money) && strongPositive(d.family) && strongPositive(d.self),
  },
  {
    id: 'theme.expansion-window',
    meaning: '뻗어가는 결',
    narrative:
      '재물·일·자아가 같은 방향으로 정렬될 때 크게 뻗어가는 결이라, 확장과 실행이 잘 맞아요.',
    narrativeEn:
      'When money, work, and self align in one direction you expand boldly — growth and execution suit you.',
    detect: (d) =>
      has(d, 'money', strongPositive) &&
      has(d, 'career', strongPositive) &&
      (d.self.tone === 'positive' || d.self.tone === 'neutral'),
  },
  {
    id: 'theme.creative-flow',
    meaning: '창조의 결',
    narrative: '일·자아·사랑이 부드럽게 이어질 때 창작과 표현이 자연스럽게 흐르는 결이에요.',
    narrativeEn:
      'When career, self, and love connect smoothly, creation and expression flow naturally.',
    detect: (d) =>
      strongPositive(d.career) &&
      d.self.tone !== 'negative' &&
      d.love.tone !== 'negative' &&
      d.career.confirms.some(
        (m) => m.rule.meaning.includes('표현') || m.rule.meaning.includes('창조')
      ),
  },
  {
    id: 'theme.family-roots-call',
    meaning: '뿌리의 결',
    narrative: '가정과 자아가 깊이 얽혀, 원가족·뿌리가 평생 자기 정체성의 바탕이 되는 결이에요.',
    narrativeEn:
      'Home and self are deeply intertwined — family and roots stay the bedrock of who you are.',
    detect: (d) => anyStrongConfirm(d.family) && (anyStrongConfirm(d.self) || strongMixed(d.self)),
  },
  {
    id: 'theme.identity-shift',
    meaning: '거듭 다시 쓰는 결',
    narrative: '자아와 관계가 함께 크게 바뀌며 정체성을 거듭 다시 쓰는 결이에요.',
    narrativeEn:
      'Self and relationships transform together, so you rewrite your identity more than once.',
    detect: (d) => strongMixed(d.self) && strongMixed(d.love),
  },
  {
    id: 'theme.solo-ascent',
    meaning: '홀로 오르는 결',
    narrative: '자아와 일이 단단할 때 혼자 추진하는 길에서 가장 빛나는 결이에요.',
    narrativeEn: 'You shine most on the path you drive alone, when self and work are solid.',
    detect: (d) => strongPositive(d.self) && strongPositive(d.career) && d.love.tone === 'neutral',
  },
  {
    id: 'theme.career-health-tradeoff',
    meaning: '성취와 건강의 균형',
    narrative:
      '성취를 좇을 때 몸이 먼저 신호를 보내는 결이 있어, 일과 건강의 균형이 평생 숙제예요.',
    narrativeEn:
      'When you chase achievement your body signals first — balancing work and health is a lifelong task.',
    detect: (d) => has(d, 'career', strongPositive) && has(d, 'health', strongNegative),
  },
  {
    id: 'theme.duty-overload',
    meaning: '책임을 내려놓는 법',
    narrative:
      '책임이 자아보다 앞서 쌓이기 쉬운 결이라, 내려놓고 맡기는 법을 익히는 게 평생 과제예요.',
    narrativeEn:
      'Responsibility tends to pile ahead of self — learning to delegate and let go is a lifelong lesson.',
    detect: (d) => has(d, 'career', strongNegative) && has(d, 'self', strongNegative),
  },
  {
    id: 'theme.foundation-rebuild',
    meaning: '기반을 다시 세우는 힘',
    narrative:
      '가정과 재물의 기반을 거듭 다시 세우는 결이 있어, 안을 정리하는 힘이 곧 자산이 돼요.',
    narrativeEn:
      'You rebuild the foundations of home and finances more than once — your gift is putting things in order.',
    detect: (d) => has(d, 'family', strongNegative) && has(d, 'money', strongNegative),
  },
  {
    id: 'theme.relational-financial-strain',
    meaning: '관계와 돈을 함께 다루는 법',
    narrative:
      '사랑과 재물이 함께 출렁이는 결이 반복돼, 관계와 돈을 한 묶음으로 다루는 법이 평생 과제예요.',
    narrativeEn:
      'Love and money tend to move together for you — handling relationship and finances as one is a lifelong lesson.',
    detect: (d) => has(d, 'love', strongNegative) && has(d, 'money', strongNegative),
  },
]
