/**
 * ganjiFormatter.ts - 간지 포맷팅 유틸리티
 */

import { stemToKorean, branchToKorean } from '../data/ganjiMappings'
import type { PillarData } from '../prompt-types'

/**
 * 간지를 쉬운 한글 형태로 변환
 */
export function formatGanjiEasy(stem?: string, branch?: string): string {
  if (!stem || !branch) {
    return '-'
  }
  const stemKo = stemToKorean[stem] || stem
  const branchKo = branchToKorean[branch] || branch
  return `${stemKo} + ${branchKo}`
}

/**
 * 간지 문자열에서 천간/지지 분리 후 쉬운 형태로 변환
 */
export function parseGanjiEasy(ganji?: string): string {
  if (!ganji || ganji.length < 2) {
    return ganji || '-'
  }
  const stem = ganji[0]
  const branch = ganji[1]
  return formatGanjiEasy(stem, branch)
}

/**
 * 사주 기둥 데이터를 간지 문자열로 포맷
 */
export function formatPillar(p: PillarData | undefined): string | null {
  if (!p) {
    return null
  }
  const stem = p.heavenlyStem?.name || p.ganji?.split?.('')?.[0] || ''
  const branch = p.earthlyBranch?.name || p.ganji?.split?.('')?.[1] || ''
  return stem && branch ? `${stem}${branch}` : null
}
