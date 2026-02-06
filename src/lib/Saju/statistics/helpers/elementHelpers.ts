/**
 * elementHelpers.ts - 오행 관련 헬퍼 함수
 */

import { STEMS, BRANCHES } from '../../constants'

export function getStemElement(stemName: string): string {
  const stem = STEMS.find((s) => s.name === stemName)
  return stem?.element || '토'
}

export function getBranchElement(branchName: string): string {
  const branch = BRANCHES.find((b) => b.name === branchName)
  return branch?.element || '토'
}

export function getStemYinYang(stemName: string): '음' | '양' {
  const stem = STEMS.find((s) => s.name === stemName)
  return stem?.yin_yang === '음' ? '음' : '양'
}

export function getBranchYinYang(branchName: string): '음' | '양' {
  const branch = BRANCHES.find((b) => b.name === branchName)
  return branch?.yin_yang === '음' ? '음' : '양'
}
