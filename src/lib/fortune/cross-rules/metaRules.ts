// Meta-rules: detect cross-domain themes from the per-domain aggregates.
// Run AFTER the regular rule pass — they don't see raw signals, only the
// already-decided per-domain outcomes. This is where "관계와 돈이 동시 압박"
// type patterns surface.

import type { Domain, DomainAggregate, MetaRule } from './types'

const has = (
  byDomain: Record<Domain, DomainAggregate>,
  domain: Domain,
  pred: (b: DomainAggregate) => boolean,
) => pred(byDomain[domain])

const negativeOrMixed = (b: DomainAggregate) =>
  b.tone === 'negative' || b.tone === 'mixed' ||
  b.conflicts.length >= 2 ||
  b.confirms.some((m) => m.rule.polarityHint === 'neg')

export const metaRules: MetaRule[] = [
  {
    id: 'theme.relational-financial-strain',
    meaning: '관계×재물 동시 압박',
    narrative:
      '사랑·재물 두 영역에서 동시에 부정 신호가 모임 — 분리·분할·재산 분쟁의 잠재 시기. 큰 결정은 보류 권장.',
    detect: (d) => has(d, 'love', negativeOrMixed) && has(d, 'money', negativeOrMixed),
  },
  {
    id: 'theme.career-health-tradeoff',
    meaning: '성취×건강 트레이드오프',
    narrative:
      '직업·성취 영역의 강한 활성과 건강 영역의 위축이 겹침 — 성과의 대가로 신체·수면이 깎이는 시기.',
    detect: (d) =>
      d.career.tone === 'positive' && has(d, 'health', negativeOrMixed),
  },
  {
    id: 'theme.identity-shift',
    meaning: '자아 재정의 국면',
    narrative:
      '자아·관계가 동시에 흔들림 — 정체성의 외피와 거울이 같이 변하는 전환기. 새 자기 정의의 호기.',
    detect: (d) => d.self.tone === 'mixed' && d.love.tone !== 'neutral',
  },
  {
    id: 'theme.expansion-window',
    meaning: '확장의 창',
    narrative:
      '재물·직업·자아가 모두 양호 — 외부 활동·확장·계약에 유리한 드문 시기. 실행 우선.',
    detect: (d) =>
      d.money.tone === 'positive' &&
      d.career.tone === 'positive' &&
      (d.self.tone === 'positive' || d.self.tone === 'neutral'),
  },
  {
    id: 'theme.family-roots-call',
    meaning: '뿌리로의 회귀',
    narrative:
      '가정·자아 영역에 동시 신호 — 원가족·고향·뿌리 관련 사건/감정이 표면화되는 시기.',
    detect: (d) =>
      d.family.tone !== 'neutral' && d.self.tone !== 'neutral',
  },
]
