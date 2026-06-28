/**
 * Destiny Calendar Utilities
 * 운명 캘린더 유틸리티 함수
 */

import { JIJANGGAN, STEM_TO_ELEMENT, BRANCH_TO_ELEMENT, CHUNG, XING, SAMHAP } from './constants'

// ============================================================
// 천을귀인 체크 — canonical implementation lives in lib/saju.
// ============================================================
export { isCheoneulGwiin } from '@/lib/saju/stemBranchUtils'

// ============================================================
// air를 metal로 매핑
// ============================================================
export function normalizeElement(el: string): string {
  return el === 'air' ? 'metal' : el
}

// ============================================================
// 삼합 체크
// ============================================================
export function isSamhapPartial(branches: string[]): boolean {
  for (const element of Object.values(SAMHAP)) {
    const count = branches.filter((b) => element.includes(b)).length
    if (count >= 2) {
      return true
    }
  }
  return false
}

export function isSamhapFull(branches: string[]): string | null {
  for (const [element, samhapBranches] of Object.entries(SAMHAP)) {
    if (samhapBranches.every((b) => branches.includes(b))) {
      return element
    }
  }
  return null
}

// ============================================================
// 충 체크
// ============================================================
export function isChung(branch1: string, branch2: string): boolean {
  return CHUNG[branch1] === branch2
}

// ============================================================
// 형 체크
// ============================================================
export function isXing(branch1: string, branch2: string): boolean {
  return XING[branch1]?.includes(branch2) ?? false
}

// ============================================================
// 지장간 가져오기
// ============================================================
export function getJijanggan(branch: string): string[] {
  const jj = JIJANGGAN[branch]
  if (!jj) {
    return []
  }
  const result: string[] = []
  if (jj.여기) {
    result.push(jj.여기)
  }
  if (jj.중기) {
    result.push(jj.중기)
  }
  result.push(jj.정기)
  return result
}

// ============================================================
// 오행 가져오기
// ============================================================
export function getStemElement(stem: string): string {
  return STEM_TO_ELEMENT[stem] ?? ''
}

export function getBranchElement(branch: string): string {
  return BRANCH_TO_ELEMENT[branch] ?? ''
}
