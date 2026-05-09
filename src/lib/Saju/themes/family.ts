// Saju/themes/family.ts
// 가족 single-chart 테마 wrapper. astrology/themes/family.ts 와 mirror.
// 핵심: 년주(조상·먼 부모), 월주(부모·형제), 일지(배우자), 시주(자녀).
// 사주 기존 familyLineage.ts 는 multi-person 비교 분석 — 본 파일은 single-chart 위치 분석.

import { analyzeSibsinPositions, countSibsin } from '../foundation/sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

export function analyzeFamilySaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const factors: SajuThemeFactor[] = []
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)

  factors.push({
    source: `년주 ${pillars.year.stem}${pillars.year.branch}`,
    meaning: '조상·먼 부모·가문 뿌리의 결.',
    tone: 'neutral',
  })
  factors.push({
    source: `월주 ${pillars.month.stem}${pillars.month.branch}`,
    meaning: '부모·형제·성장 환경의 결.',
    tone: 'neutral',
  })
  factors.push({
    source: `일지 ${pillars.day.branch}`,
    meaning: '배우자궁 — 결혼 후 가정의 결.',
    tone: 'neutral',
  })
  factors.push({
    source: `시주 ${pillars.hour.stem}${pillars.hour.branch}`,
    meaning: '자녀·말년 가정의 결.',
    tone: 'neutral',
  })

  // 인성 = 부모 시그널, 식상 = 자녀 시그널
  const parentSignal = count.정인 + count.편인
  const childSignal = count.식신 + count.상관

  if (parentSignal > 0) {
    factors.push({
      source: `인성: 정인(${count.정인}) + 편인(${count.편인})`,
      meaning: '부모·학습·보호 결 — 인연 두텁다.',
      tone: 'positive',
    })
  }
  if (childSignal > 0) {
    factors.push({
      source: `식상: 식신(${count.식신}) + 상관(${count.상관})`,
      meaning: '자녀·창조·표현 결.',
      tone: 'positive',
    })
  }

  const summary = `가족 영역: 4기둥 + 인성=${parentSignal}, 식상=${childSignal}`
  return { theme: 'family', factors, summary }
}
