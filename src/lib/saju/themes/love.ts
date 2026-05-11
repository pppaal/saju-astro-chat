// Saju/themes/love.ts
// 사랑/배우자 single-chart 테마 wrapper. astrology/themes/love.ts 와 mirror.
// 핵심: 일지(배우자궁) + 정재·정관·편재·편관 십신.

import { analyzeSibsinPositions, countSibsin } from '../sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

export function analyzeLoveSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  // sibsinAnalysis 의 내부 SajuPillars 타입과 동일한 모양이므로 캐스트
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  // 일지 = 배우자궁
  const dayBranch = pillars.day.branch
  factors.push({
    source: `일지 ${dayBranch} (배우자궁)`,
    meaning: '일지가 배우자의 자리 — 배우자의 결을 직접 반영.',
    tone: 'neutral',
  })

  // 정재·정관 = 안정 결합 / 편재·편관 = 강렬·변동 결합
  const stableLove = count.정재 + count.정관
  const dynamicLove = count.편재 + count.편관

  if (stableLove > 0) {
    factors.push({
      source: `정재(${count.정재}) + 정관(${count.정관})`,
      meaning: '안정 결합 결 — 정통적·책임 있는 관계.',
      tone: 'positive',
    })
  }
  if (dynamicLove > 0) {
    factors.push({
      source: `편재(${count.편재}) + 편관(${count.편관})`,
      meaning: '강렬·변동 결합 결 — 끌림과 갈등이 강함.',
      tone: 'mixed',
    })
  }
  if (stableLove === 0 && dynamicLove === 0) {
    factors.push({
      source: '재성·관성 없음',
      meaning: '재관 무근 — 배우자 인연이 약하거나 늦음.',
      tone: 'cautious',
    })
  }

  const summary = `사랑 영역: ${factors.length}개 결. 핵심: ${factors[0].source}`
  return { theme: 'love', factors, summary }
}
