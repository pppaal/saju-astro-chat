/**
 * Monthly Theme Aggregator
 *
 * Picks the top 3-4 most-active engine layers across a month's worth of
 * signals and produces a short Korean theme paragraph that explicitly
 * cites those layer numbers (matching the user's request: "L1, L2, L3,
 * L10" style attribution).
 */

import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'

export interface MonthlyTheme {
  /** Sorted descending by usage count, top 4. */
  topLayers: number[]
  /** Layer-citation string, e.g. "L1, L2, L4, L5". */
  layerLabel: string
  title: string
  prose: string
  /** Polarity mix used for color hint. */
  polarityMix: { strength: number; caution: number; balance: number }
}

const LAYER_NAMES: Record<number, string> = {
  1: '오행 코어',
  2: '십신×행성',
  3: '십신×하우스',
  4: '시기×트랜짓',
  5: '관계×각도',
  6: '12운성×하우스',
  7: '격국·용신',
  8: '신살×행성',
  9: '소행성×하우스',
  10: '엑스트라포인트',
}

const TITLE_TEMPLATES: Array<{
  match: (layers: number[]) => boolean
  title: string
  prose: (signals: NormalizedSignal[]) => string
}> = [
  {
    match: (layers) => layers.includes(4) && layers.includes(5),
    title: '과거의 인연과 새로운 도약',
    prose: (s) => {
      const sajuHint = s.find((x) => x.layer === 5)?.sajuBasis || '관계 신호'
      return `사주 시기 흐름과 점성 각도가 동시에 활성화되는 달이에요. 특히 ${sajuHint} 자리가 자극되며 잊고 지냈던 과거의 인연이 중요한 기회를 가져다줄 수 있어요.`
    },
  },
  {
    match: (layers) => layers.includes(1) && layers.includes(2),
    title: '본질이 또렷해지는 시기',
    prose: () =>
      '본명 코어와 십신 신호가 동시에 강해지는 달이에요. 평소 본인의 결을 따라 결정하면 흔들림이 적고, 무리한 변화보다 자기 흐름에 집중하는 게 유리해요.',
  },
  {
    match: (layers) => layers.includes(8),
    title: '귀인의 자리가 열리는 달',
    prose: () =>
      '신살 자리가 활성화돼서 결정적인 순간 외부에서 도와주는 사람이 자연스럽게 등장해요. 외부 멘토·소개·연락에 마음을 열어두면 1-2개 인연이 길게 남을 수 있어요.',
  },
  {
    match: (layers) => layers.includes(4),
    title: '타이밍이 무르익는 달',
    prose: () =>
      '대운·세운·월운 시기 흐름이 점성 cycle과 겹치며 결정 압력이 평소보다 커져요. 큰 결정은 한 박자 늦게, 단 결정 후엔 빠르게 실행하는 패턴이 잘 맞아요.',
  },
  {
    match: () => true,
    title: '다층 흐름이 겹치는 달',
    prose: () =>
      '여러 층의 신호가 동시에 작동하는 달이에요. 본명 본질과 시기 흐름을 균형 있게 보고, 한 가지에 몰입하기보다 흐름을 따라가는 자세가 도움이 돼요.',
  },
]

export function buildMonthlyTheme(signals: NormalizedSignal[]): MonthlyTheme {
  if (signals.length === 0) {
    return {
      topLayers: [],
      layerLabel: '',
      title: '신호 부족',
      prose: '이번 달 활성 신호 데이터가 부족해요. 사주 정보를 다시 확인해주세요.',
      polarityMix: { strength: 0, caution: 0, balance: 0 },
    }
  }

  // Count signals per layer.
  const layerCounts = new Map<number, number>()
  const polarityMix = { strength: 0, caution: 0, balance: 0 }
  for (const signal of signals) {
    layerCounts.set(signal.layer, (layerCounts.get(signal.layer) || 0) + 1)
    if (signal.polarity === 'strength') polarityMix.strength++
    else if (signal.polarity === 'caution') polarityMix.caution++
    else polarityMix.balance++
  }

  const topLayers = Array.from(layerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([layer]) => layer)
    .sort((a, b) => a - b)

  const layerLabel = topLayers.map((l) => `L${l}`).join(', ')

  const template = TITLE_TEMPLATES.find((t) => t.match(topLayers))!

  return {
    topLayers,
    layerLabel,
    title: template.title,
    prose: template.prose(signals),
    polarityMix,
  }
}

export function describeLayer(layer: number): string {
  return LAYER_NAMES[layer] || `Layer ${layer}`
}
