/**
 * Family Lineage Analysis Constants
 * Extracted from familyLineage.ts for better organization
 */

import type { FamilyRole } from './types'

// 상생 관계 (Productive Cycle)
export const SANGSEANG: Record<string, string> = {
  목: '화',
  화: '토',
  토: '금',
  금: '수',
  수: '목',
}

// 상극 관계 (Destructive Cycle)
export const SANGKEUK: Record<string, string> = {
  목: '토',
  화: '금',
  토: '수',
  금: '목',
  수: '화',
}

// 천간 합 (Heavenly Stem Combinations)
export const CHEONGAN_HAP: Record<string, string> = {
  갑: '기',
  을: '경',
  병: '신',
  정: '임',
  무: '계',
  기: '갑',
  경: '을',
  신: '병',
  임: '정',
  계: '무',
}

// 지지 육합 (Six Earthly Branch Combinations)
export const YUKAP: Record<string, string> = {
  자: '축',
  축: '자',
  인: '해',
  해: '인',
  묘: '술',
  술: '묘',
  진: '유',
  유: '진',
  사: '신',
  신: '사',
  오: '미',
  미: '오',
}

// 지지 삼합 (Three Earthly Branch Combinations)
export const SAMHAP: Record<string, string[]> = {
  신: ['자', '진'],
  자: ['신', '진'],
  진: ['신', '자'], // 수국
  인: ['오', '술'],
  오: ['인', '술'],
  술: ['인', '오'], // 화국
  해: ['묘', '미'],
  묘: ['해', '미'],
  미: ['해', '묘'], // 목국
  사: ['유', '축'],
  유: ['사', '축'],
  축: ['사', '유'], // 금국
}

// 지지 충 (Earthly Branch Conflicts)
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

// 가족 역할별 오행 에너지 (Family Role Element Energy)
export const ROLE_ELEMENT_ENERGY: Record<FamilyRole, { primary: string; secondary: string }> = {
  father: { primary: '목', secondary: '금' },
  mother: { primary: '토', secondary: '수' },
  self: { primary: '화', secondary: '목' },
  spouse: { primary: '금', secondary: '토' },
  child: { primary: '수', secondary: '화' },
  sibling: { primary: '목', secondary: '화' },
  grandparent: { primary: '토', secondary: '금' },
}
