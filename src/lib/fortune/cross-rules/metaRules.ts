// Meta-rules: detect cross-domain themes from per-domain aggregates.
// Run AFTER the regular rule pass.

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

const strongPositive = (b: DomainAggregate) =>
  b.tone === 'positive' && b.confirms.some((m) => m.intensity === 'strong')

export const metaRules: MetaRule[] = [
  {
    id: 'theme.relational-financial-strain',
    meaning: '관계×재물 동시 압박',
    narrative: '사랑·재물 두 영역에서 동시에 부정 신호가 모임 — 분리·분할·재산 분쟁의 잠재 시기. 큰 결정은 보류 권장.',
    detect: (d) => has(d, 'love', negativeOrMixed) && has(d, 'money', negativeOrMixed),
  },
  {
    id: 'theme.career-health-tradeoff',
    meaning: '성취×건강 트레이드오프',
    narrative: '직업·성취 영역의 강한 활성과 건강 영역의 위축이 겹침 — 성과의 대가로 신체·수면이 깎이는 시기.',
    detect: (d) => d.career.tone === 'positive' && has(d, 'health', negativeOrMixed),
  },
  {
    id: 'theme.identity-shift',
    meaning: '자아 재정의 국면',
    narrative: '자아·관계가 동시에 흔들림 — 정체성의 외피와 거울이 같이 변하는 전환기. 새 자기 정의의 호기.',
    detect: (d) => d.self.tone === 'mixed' && d.love.tone !== 'neutral',
  },
  {
    id: 'theme.expansion-window',
    meaning: '확장의 창',
    narrative: '재물·직업·자아가 모두 양호 — 외부 활동·확장·계약에 유리한 드문 시기. 실행 우선.',
    detect: (d) =>
      d.money.tone === 'positive' &&
      d.career.tone === 'positive' &&
      (d.self.tone === 'positive' || d.self.tone === 'neutral'),
  },
  {
    id: 'theme.family-roots-call',
    meaning: '뿌리로의 회귀',
    narrative: '가정·자아 영역에 동시 신호 — 원가족·고향·뿌리 관련 사건/감정이 표면화되는 시기.',
    detect: (d) => d.family.tone !== 'neutral' && d.self.tone !== 'neutral',
  },
  {
    id: 'theme.solo-ascent',
    meaning: '독립 상승',
    narrative: '자아·직업 양호 + 관계 영역은 잠잠 — 혼자 추진하는 일·독립 프로젝트에 유리한 시기.',
    detect: (d) =>
      strongPositive(d.self) &&
      strongPositive(d.career) &&
      d.love.tone === 'neutral',
  },
  {
    id: 'theme.foundation-rebuild',
    meaning: '기반 재구축',
    narrative: '가정·재물 영역에 부정 신호 동시 — 살림·기반 재정비의 시기. 외부 확장보다 내부 정리가 효과적.',
    detect: (d) => has(d, 'family', negativeOrMixed) && has(d, 'money', negativeOrMixed),
  },
  {
    id: 'theme.creative-flow',
    meaning: '창조 흐름',
    narrative: '직업·자아·사랑 영역에 부드러운 신호가 함께 — 창작·표현·관계 통합이 자연스럽게 흐르는 호기.',
    detect: (d) =>
      d.career.tone === 'positive' &&
      d.self.tone !== 'negative' &&
      d.love.tone !== 'negative' &&
      d.career.confirms.some((m) => m.rule.meaning.includes('표현') || m.rule.meaning.includes('창조')),
  },
  {
    id: 'theme.duty-overload',
    meaning: '책임 과부하',
    narrative: '직업·자아 모두 부정 신호 — 책임은 늘고 자원은 감소. 위임·우선순위 정리 권장.',
    detect: (d) => has(d, 'career', negativeOrMixed) && has(d, 'self', negativeOrMixed),
  },
  {
    id: 'theme.harvest-season',
    meaning: '수확기',
    narrative: '재물·가정·자아 모두 안정 신호 — 그동안의 노력이 결실로 돌아오는 안정기. 확산보다 누림이 적기.',
    detect: (d) => d.money.tone === 'positive' && d.family.tone === 'positive' && d.self.tone === 'positive',
  },
]
