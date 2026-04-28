// Demo: hand-built signal inputs that exercise the pipeline end-to-end without
// requiring the real saju/astro engines. Use this for unit tests and to see
// what the rendered output looks like.
//
//   tsx src/lib/fortune/cross-rules/demo.ts

import { aggregate } from './aggregator'
import { runRules } from './engine'
import { metaRules } from './metaRules'
import { render, renderToText } from './renderer'
import { allRules } from './rules'
import type { AstroSignal, FortuneReport, SajuSignal } from './types'

// Synthetic case: 신약 일간, 화 약 / 수 결, 일지 충, 세운 정재,
// SR Jupiter 2궁, 세운 편관도 함께(양면), Saturn transit hard.
const sajuSignals: SajuSignal[] = [
  { system: 'saju', layer: 'state', key: 'saju.state.dayMaster.element.water',
    fired: true, strength: 1, evidence: { dayMaster: '癸' } },
  { system: 'saju', layer: 'state', key: 'saju.state.elementAbsent.water',
    fired: true, strength: 1, evidence: { count: 0 } },
  { system: 'saju', layer: 'state', key: 'saju.state.dayMaster.strength.weak',
    fired: true, strength: 0.8, evidence: { sameElCount: 1 } },
  { system: 'saju', layer: 'state', key: 'saju.state.elementDominant.earth',
    fired: true, strength: 0.5, evidence: { count: 4, total: 8 } },
  { system: 'saju', layer: 'relation', key: 'saju.relation.day.지지충',
    fired: true, strength: 0.9, evidence: { detail: '寅-申 충' } },
  { system: 'saju', layer: 'timing', scale: 'year',
    key: 'saju.timing.seun.sibsin.정재',
    fired: true, strength: 0.9, evidence: { sibsin: { cheon: '정재' } } },
  { system: 'saju', layer: 'timing', scale: 'year',
    key: 'saju.timing.seun.sibsin.편관',
    fired: true, strength: 0.9, evidence: { sibsin: { cheon: '편관' } } },
  { system: 'saju', layer: 'timing', scale: 'event',
    key: 'saju.timing.event.day.지지충',
    fired: true, strength: 1, evidence: { source: 'seun', kind: '지지충' } },
]

const astroSignals: AstroSignal[] = [
  { system: 'astro', layer: 'state', key: 'astro.state.planet.Sun.sign.Libra',
    fired: true, strength: 1, evidence: { sign: 'Libra' } },
  { system: 'astro', layer: 'state', key: 'astro.state.elementCount.water',
    fired: true, strength: 0.1, evidence: { count: 1, total: 10 } },
  { system: 'astro', layer: 'state', key: 'astro.state.elementDominant.earth',
    fired: true, strength: 0.5, evidence: { count: 5, total: 10 } },
  { system: 'astro', layer: 'state', key: 'astro.state.planet.Venus.house.7',
    fired: true, strength: 1, evidence: { house: 7 } },
  { system: 'astro', layer: 'relation', key: 'astro.relation.hard.Mars.Venus',
    fired: true, strength: 0.7, evidence: { type: 'square', orb: 2.4 } },
  { system: 'astro', layer: 'timing', scale: 'year',
    key: 'astro.timing.solarReturn.Jupiter.house.2',
    fired: true, strength: 1, evidence: { house: 2 } },
  { system: 'astro', layer: 'timing', scale: 'year',
    key: 'astro.timing.transit.Saturn.opposition.natal.Sun',
    fired: true, strength: 0.8, evidence: { type: 'opposition', orb: 1.0 } },
  { system: 'astro', layer: 'timing', scale: 'event',
    key: 'astro.timing.event.activate.Sun',
    fired: true, strength: 0.8, evidence: { trigger: 'Saturn', target: 'Sun' } },
]

export function runDemo(): { report: FortuneReport; text: string } {
  const matches = runRules(allRules, sajuSignals, astroSignals)
  const report = aggregate(matches, metaRules)
  return { report, text: renderToText(report) }
}

if (typeof require !== 'undefined' && require.main === module) {
  const { text } = runDemo()
  // eslint-disable-next-line no-console
  console.log(text)
}

export { sajuSignals, astroSignals }
export { render }
