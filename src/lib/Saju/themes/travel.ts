// Saju/themes/travel.ts
// 여행/이동 테마. 역마살·지살 + 寅申巳亥(생지) 활성도.

import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

const SAENGJI = new Set(['寅', '申', '巳', '亥', '인', '신', '사', '해'])

// 역마살: 寅午戌(인오술) → 申, 申子辰(신자진) → 寅, 巳酉丑(사유축) → 亥, 亥卯未(해묘미) → 巳
const YEOKMA_BY_DAY_BRANCH: Record<string, string> = {
  '寅': '申', '午': '申', '戌': '申',
  '申': '寅', '子': '寅', '辰': '寅',
  '巳': '亥', '酉': '亥', '丑': '亥',
  '亥': '巳', '卯': '巳', '未': '巳',
  '인': '申', '오': '申', '술': '申',
  '신': '寅', '자': '寅', '진': '寅',
  '사': '亥', '유': '亥', '축': '亥',
  '해': '巳', '묘': '巳', '미': '巳',
}

export function analyzeTravelSaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const factors: SajuThemeFactor[] = []
  const dayBranch = pillars.day.branch
  const allBranches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch]

  // 생지(寅申巳亥) 개수 = 이동 활성도
  const saengjiCount = allBranches.filter((b) => SAENGJI.has(b)).length
  if (saengjiCount >= 2) {
    factors.push({
      source: `생지(寅申巳亥) ${saengjiCount}개`,
      meaning: '생지 다수 — 이동·여행·외부 활동 강함.',
      tone: 'positive',
    })
  }

  // 역마살 검사 (일지 기준)
  const yeokmaTarget = YEOKMA_BY_DAY_BRANCH[dayBranch]
  if (yeokmaTarget && allBranches.includes(yeokmaTarget)) {
    factors.push({
      source: `역마살 ${yeokmaTarget}`,
      meaning: '역마 발현 — 이동·해외·전직·전학 결.',
      tone: 'mixed',
    })
  }

  if (factors.length === 0) {
    factors.push({
      source: '생지·역마 약함',
      meaning: '안정 정주형. 큰 이동 결 없음.',
      tone: 'neutral',
    })
  }

  return {
    theme: 'travel',
    factors,
    summary: `여행/이동 영역: 생지 ${saengjiCount}, 역마 ${factors.some((f) => f.source.includes('역마')) ? '발현' : '없음'}`,
  }
}
