// src/lib/Saju/event-correlation/helpers.ts
// 사주 사건 상관관계 분석 헬퍼 함수

import { StemBranchInfo } from '../types'
import { STEMS, BRANCHES } from '../constants'

// ============================================================================
// 기본 조회 함수
// ============================================================================

export function getStemInfo(stemName: string): StemBranchInfo | undefined {
  return STEMS.find((s) => s.name === stemName)
}

export function getBranchInfo(branchName: string): StemBranchInfo | undefined {
  return BRANCHES.find((b) => b.name === branchName)
}

export function getStemElement(stemName: string): string {
  const stem = getStemInfo(stemName)
  return stem?.element || '토'
}

export function getBranchElement(branchName: string): string {
  const branch = getBranchInfo(branchName)
  return branch?.element || '토'
}

// ============================================================================
// 관계 상수 (천간/지지 합충형)
// ============================================================================

// 천간 합
export const CHEONGAN_HAP: Record<string, { partner: string; result: string }> = {
  갑: { partner: '기', result: '토' },
  을: { partner: '경', result: '금' },
  병: { partner: '신', result: '수' },
  정: { partner: '임', result: '목' },
  무: { partner: '계', result: '화' },
  기: { partner: '갑', result: '토' },
  경: { partner: '을', result: '금' },
  신: { partner: '병', result: '수' },
  임: { partner: '정', result: '목' },
  계: { partner: '무', result: '화' },
}

// 천간 충
export const CHEONGAN_CHUNG: Record<string, string> = {
  갑: '경',
  을: '신',
  병: '임',
  정: '계',
  무: '갑',
  경: '갑',
  신: '을',
  임: '병',
  계: '정',
}

// 지지 육합
export const YUKAP: Record<string, { partner: string; result: string }> = {
  자: { partner: '축', result: '토' },
  축: { partner: '자', result: '토' },
  인: { partner: '해', result: '목' },
  해: { partner: '인', result: '목' },
  묘: { partner: '술', result: '화' },
  술: { partner: '묘', result: '화' },
  진: { partner: '유', result: '금' },
  유: { partner: '진', result: '금' },
  사: { partner: '신', result: '수' },
  신: { partner: '사', result: '수' },
  오: { partner: '미', result: '토' },
  미: { partner: '오', result: '토' },
}

// 지지 삼합
export const SAMHAP: Record<string, { members: string[]; result: string }> = {
  수국: { members: ['신', '자', '진'], result: '수' },
  화국: { members: ['인', '오', '술'], result: '화' },
  목국: { members: ['해', '묘', '미'], result: '목' },
  금국: { members: ['사', '유', '축'], result: '금' },
}

// 지지 충
export const CHUNG: Record<string, string> = {
  자: '오',
  오: '자',
  축: '미',
  미: '축',
  인: '신',
  신: '인',
  묘: '유',
  유: '묘',
  진: '술',
  술: '진',
  사: '해',
  해: '사',
}

// 지지 형
export const HYEONG: Record<string, string[]> = {
  인: ['사', '신'],
  사: ['인', '신'],
  신: ['인', '사'],
  축: ['술', '미'],
  술: ['축', '미'],
  미: ['축', '술'],
  자: ['묘'],
  묘: ['자'],
  진: ['진'],
  오: ['오'],
  유: ['유'],
  해: ['해'],
}

// 귀인
export const GWIIN: Record<string, string[]> = {
  갑: ['축', '미'],
  을: ['자', '신'],
  병: ['해', '유'],
  정: ['해', '유'],
  무: ['축', '미'],
  기: ['자', '신'],
  경: ['축', '미'],
  신: ['인', '오'],
  임: ['묘', '사'],
  계: ['묘', '사'],
}

// 역마
export const YEOKMA: Record<string, string> = {
  신자진: '인',
  인오술: '신',
  해묘미: '사',
  사유축: '해',
}
