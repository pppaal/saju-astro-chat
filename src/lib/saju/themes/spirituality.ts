// Saju/themes/spirituality.ts
// 영성/종교 테마. 화개살 + 인성(편인 특히) + 휴면 12운성.

import { analyzeSibsinPositions, countSibsin } from '../sibsinAnalysis'
import type { SajuThemeAnalysis, SajuThemeFactor, SimpleSajuPillars } from './types'

const HWAGAE = new Set(['辰', '戌', '丑', '未', '진', '술', '축', '미'])

export function analyzeSpiritualitySaju(pillars: SimpleSajuPillars): SajuThemeAnalysis {
  const positions = analyzeSibsinPositions(pillars as never)
  const count = countSibsin(positions)
  const factors: SajuThemeFactor[] = []

  // 화개살 검사 (지지에 辰戌丑未 中 활성)
  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch]
  const hwagaeCount = branches.filter((b) => HWAGAE.has(b)).length
  if (hwagaeCount >= 1) {
    factors.push({
      source: `화개 지지 ${hwagaeCount}개 (辰戌丑未)`,
      meaning: '내면 정리·종교·예술·고독 결. 영성·수행 친화.',
      tone: 'mixed',
    })
  }

  if (count.편인 > 0) {
    factors.push({
      source: `편인 ${count.편인}개`,
      meaning: '비정통·신비주의·역학·종교 친화 결.',
      tone: 'positive',
    })
  }

  if (factors.length === 0) {
    factors.push({
      source: '화개·편인 약함',
      meaning: '영성 결 약함. 실용·세속 지향.',
      tone: 'neutral',
    })
  }

  return {
    theme: 'spirituality',
    factors,
    summary: `영성 영역: 화개 ${hwagaeCount}, 편인 ${count.편인}`,
  }
}
