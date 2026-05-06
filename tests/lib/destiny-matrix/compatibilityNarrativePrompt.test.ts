import { describe, expect, it } from 'vitest'

import {
  buildCompatibilityNarrativeSystemPrompt,
  buildCompatibilityNarrativeUserPrompt,
} from '@/lib/destiny-matrix/compatibility/narrativePrompt'
import type { ThreeLayerCompatibility } from '@/lib/destiny-matrix/compatibility'

const layers: ThreeLayerCompatibility = {
  layer1_saju: {
    score: 72,
    signals: [
      { text: '일간 천간합 丁-壬 — 부드럽게 맞물리는 협력 구도', delta: 12 },
      { text: '일지 충 卯-酉 — 환경·생활방식 충돌, 거리 조절 필요', delta: -10 },
    ],
    narration: '사주 궁합은 안정 구간이에요.',
  },
  layer2_synastry: {
    score: 60,
    signals: [{ text: '태양 화 / 달 금 — 의사소통 빠르되 정서 결이 다름', delta: -2 }],
    narration: '점성 시너스트리는 자극과 보완이 섞인 구도입니다.',
  },
  layer3_composite: {
    score: 65,
    signals: [{ text: '5행 보완 — 부족한 오행을 채워주는 구도 (3개)', delta: 8 }],
    narration: '컴포지트는 균형 잡힌 협력 에너지입니다.',
  },
  integrated: {
    score: 66,
    level: '잘 맞는 사이',
    narration: '두 사람은 큰 갈등 없이 협력할 수 있는 안정 구간입니다.',
  },
}

describe('buildCompatibilityNarrativeSystemPrompt', () => {
  it('demands JSON-only output and lists schema keys', () => {
    const prompt = buildCompatibilityNarrativeSystemPrompt()
    expect(prompt).toContain('JSON')
    expect(prompt).toContain('summary')
    expect(prompt).toContain('insights')
    expect(prompt).toContain('keyMoments')
    expect(prompt).toContain('dosAndDonts')
  })
})

describe('buildCompatibilityNarrativeUserPrompt', () => {
  it('embeds all three layers, scores and the integrated narration', () => {
    const prompt = buildCompatibilityNarrativeUserPrompt({
      personA: { birthDate: '1990-05-12', birthTime: '14:30', gender: 'male' },
      personB: { birthDate: '1992-08-04', birthTime: '09:15', gender: 'female' },
      labelA: '진우',
      labelB: '소은',
      layers,
    })
    expect(prompt).toContain('진우')
    expect(prompt).toContain('소은')
    expect(prompt).toContain('Layer 1: 사주 정합도')
    expect(prompt).toContain('Layer 2: 점성 시너스트리')
    expect(prompt).toContain('Layer 3: 합쳐진 에너지')
    expect(prompt).toContain('점수: 72/100')
    expect(prompt).toContain('점수: 66/100')
    expect(prompt).toContain('잘 맞는 사이')
    expect(prompt).toContain('일간 천간합 丁-壬')
  })
})
