// Saju/themes/money.ts
// 돈/재물 테마. astrology/themes/money.ts 와 mirror.
// 핵심: 정재·편재(재성), 식신·상관(생재), 비견·겁재(쟁재).

import { analyzeSibsinPositions, countSibsin } from '../sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

export function analyzeMoneySaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  const wealth = count.정재 + count.편재
  const generators = count.식신 + count.상관
  const competitors = count.비견 + count.겁재

  if (wealth > 0) {
    factors.push({
      source: `재성: 정재(${count.정재}) + 편재(${count.편재})`,
      meaning: count.정재 >= count.편재
        ? '정재 우세 — 안정적 수입·정도적 재물.'
        : '편재 우세 — 변동적·기회 포착형 재물.',
      tone: 'positive',
    })
  }
  if (generators > 0) {
    factors.push({
      source: `식상: 식신(${count.식신}) + 상관(${count.상관})`,
      meaning: '재물을 생산하는 표현·기술의 결.',
      tone: 'positive',
    })
  }
  if (competitors >= 2) {
    factors.push({
      source: `비겁: 비견(${count.비견}) + 겁재(${count.겁재})`,
      meaning: '쟁재 결 — 형제·동료와 재물 다툼 주의.',
      tone: 'cautious',
    })
  }
  if (wealth === 0) {
    factors.push({
      source: '재성 없음',
      meaning: '재성 무근 — 직접 재물 인연 약함, 식상 통한 우회 필요.',
      tone: 'cautious',
    })
  }

  const summary = `재물 영역: ${factors.length}개 결. 재성=${wealth}, 식상=${generators}, 비겁=${competitors}`
  return { theme: 'money', factors, summary }
}
