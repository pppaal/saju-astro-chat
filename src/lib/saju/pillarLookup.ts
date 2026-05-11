// src/lib/Saju/pillarLookup.ts
// 60갑자 조회 모듈 - 사주명리학 기초 데이터
//
// ✅ REFACTORING COMPLETED:
// - Original 917 lines modularized for better maintainability
// - Types extracted to pillar-lookup/types.ts
// - Constants extracted to pillar-lookup/constants.ts
// - Ilju data (552 lines) extracted to pillar-lookup/ilju-data.ts
// - Core lookup functions remain in this orchestrator file
//
// Structure:
// - pillar-lookup/types.ts: Type definitions (SixtyPillarInfo, IljuInfo)
// - pillar-lookup/constants.ts: Mappings, SIXTY_PILLARS, NAEUM_DATA
// - pillar-lookup/ilju-data.ts: 60갑자 일주론 상세 데이터
// - pillar-lookup/index.ts: Unified exports
// - pillarLookup.ts: Main lookup functions (orchestrator)

import type { FiveElement, YinYang } from './types'
import { STEMS, BRANCHES } from './constants'
import {
  getStemElement,
  getBranchElement,
  getStemYinYang,
  getBranchYinYang,
} from './stemBranchUtils'

// Re-export all types and constants from modules
export type { SixtyPillarInfo, IljuInfo } from './pillar-lookup'
export {
  STEM_KOREAN,
  BRANCH_KOREAN,
  STEM_ORDER,
  BRANCH_ORDER,
  SIXTY_PILLARS,
  NAEUM_DATA,
  ILJU_DATA,
} from './pillar-lookup'

// Import for internal use
import {
  STEM_KOREAN,
  BRANCH_KOREAN,
  STEM_ORDER,
  BRANCH_ORDER,
  SIXTY_PILLARS,
  NAEUM_DATA,
  ILJU_DATA,
} from './pillar-lookup'

import type { SixtyPillarInfo, IljuInfo } from './pillar-lookup/types'

// ============ 메인 함수들 ============

/**
 * 60갑자 인덱스 계산 (1-60)
 * 천간과 지지로 60갑자 순번 계산
 */
export function calculatePillarIndex(stem: string, branch: string): number {
  const stemIdx = STEM_ORDER.indexOf(stem)
  const branchIdx = BRANCH_ORDER.indexOf(branch)

  if (stemIdx === -1 || branchIdx === -1) {
    return -1
  }

  // 천간과 지지의 음양이 맞아야 유효한 조합
  if (stemIdx % 2 !== branchIdx % 2) {
    return -1
  }

  // 60갑자 인덱스 공식
  // (천간인덱스 * 6 + 지지인덱스 / 2) % 60 + 1
  const idx = ((stemIdx - branchIdx + 60) % 10) * 6 + branchIdx
  return (idx % 60) + 1
}

/**
 * 60갑자 기본 정보 조회
 */
export function getPillarInfo(pillar: string): SixtyPillarInfo | null {
  const index = SIXTY_PILLARS.indexOf(pillar)
  if (index === -1) {
    return null
  }

  const stem = pillar[0]
  const branch = pillar[1]

  return {
    index: index + 1,
    pillar,
    stem,
    branch,
    stemKorean: STEM_KOREAN[stem] || '',
    branchKorean: BRANCH_KOREAN[branch] || '',
    koreanName: `${STEM_KOREAN[stem]}${BRANCH_KOREAN[branch]}`,
    stemElement: getStemElement(stem),
    branchElement: getBranchElement(branch),
    stemYinYang: getStemYinYang(stem),
    branchYinYang: getBranchYinYang(branch),
    naeum: NAEUM_DATA[pillar] || '',
  }
}

/**
 * 천간+지지로 갑자 문자열 생성
 */
export function makePillar(stem: string, branch: string): string | null {
  const stemIdx = STEM_ORDER.indexOf(stem)
  const branchIdx = BRANCH_ORDER.indexOf(branch)

  if (stemIdx === -1 || branchIdx === -1) {
    return null
  }
  if (stemIdx % 2 !== branchIdx % 2) {
    return null
  } // 음양 불일치

  return `${stem}${branch}`
}

/**
 * 인덱스로 60갑자 조회 (1-60)
 */
export function getPillarByIndex(index: number): string | null {
  if (index < 1 || index > 60) {
    return null
  }
  return SIXTY_PILLARS[index - 1]
}

/**
 * 한글명으로 60갑자 조회
 */
export function getPillarByKoreanName(koreanName: string): string | null {
  for (const pillar of SIXTY_PILLARS) {
    const stem = pillar[0]
    const branch = pillar[1]
    const name = `${STEM_KOREAN[stem]}${BRANCH_KOREAN[branch]}`
    if (name === koreanName) {
      return pillar
    }
  }
  return null
}

/**
 * 납음오행 조회
 */
export function getNaeum(pillar: string): string | null {
  return NAEUM_DATA[pillar] || null
}

/**
 * 납음오행 오행만 추출
 */
export function getNaeumElement(pillar: string): FiveElement | null {
  const naeum = NAEUM_DATA[pillar]
  if (!naeum) {
    return null
  }

  // 납음명에서 오행 추출 (예: 해중금 -> 금)
  if (naeum.includes('금')) {
    return '금'
  }
  if (naeum.includes('목')) {
    return '목'
  }
  if (naeum.includes('수')) {
    return '수'
  }
  if (naeum.includes('화')) {
    return '화'
  }
  if (naeum.includes('토')) {
    return '토'
  }

  return null
}

/**
 * 일주론 상세 정보 조회
 */
export function getIljuInfo(pillar: string): IljuInfo | null {
  return ILJU_DATA[pillar] || null
}

/**
 * 다음 갑자 계산
 */
export function getNextPillar(pillar: string): string | null {
  const index = SIXTY_PILLARS.indexOf(pillar)
  if (index === -1) {
    return null
  }
  return SIXTY_PILLARS[(index + 1) % 60]
}

/**
 * 이전 갑자 계산
 */
export function getPreviousPillar(pillar: string): string | null {
  const index = SIXTY_PILLARS.indexOf(pillar)
  if (index === -1) {
    return null
  }
  return SIXTY_PILLARS[(index + 59) % 60]
}

/**
 * 두 갑자 사이 거리 계산 (순행)
 */
export function getPillarDistance(from: string, to: string): number {
  const fromIdx = SIXTY_PILLARS.indexOf(from)
  const toIdx = SIXTY_PILLARS.indexOf(to)
  if (fromIdx === -1 || toIdx === -1) {
    return -1
  }
  return (toIdx - fromIdx + 60) % 60
}

/**
 * N번째 후의 갑자 계산
 */
export function getPillarAfter(pillar: string, n: number): string | null {
  const index = SIXTY_PILLARS.indexOf(pillar)
  if (index === -1) {
    return null
  }
  return SIXTY_PILLARS[(((index + n) % 60) + 60) % 60]
}

/**
 * 연도로 연주(年柱) 계산
 */
export function getYearPillar(year: number): string {
  // 기준년: 1984년 = 갑자년 (index 0)
  const baseYear = 1984
  const diff = year - baseYear
  const index = ((diff % 60) + 60) % 60
  return SIXTY_PILLARS[index]
}

/**
 * 모든 60갑자 정보 조회
 */
export function getAllPillars(): SixtyPillarInfo[] {
  return SIXTY_PILLARS.map((pillar, idx) => {
    const stem = pillar[0]
    const branch = pillar[1]
    return {
      index: idx + 1,
      pillar,
      stem,
      branch,
      stemKorean: STEM_KOREAN[stem] || '',
      branchKorean: BRANCH_KOREAN[branch] || '',
      koreanName: `${STEM_KOREAN[stem]}${BRANCH_KOREAN[branch]}`,
      stemElement: getStemElement(stem),
      branchElement: getBranchElement(branch),
      stemYinYang: getStemYinYang(stem),
      branchYinYang: getBranchYinYang(branch),
      naeum: NAEUM_DATA[pillar] || '',
    }
  })
}

/**
 * 특정 오행의 천간 목록
 */
export function getStemsByElement(element: FiveElement): string[] {
  return STEMS.filter((s) => s.element === element).map((s) => s.name)
}

/**
 * 특정 오행의 지지 목록
 */
export function getBranchesByElement(element: FiveElement): string[] {
  return BRANCHES.filter((b) => b.element === element).map((b) => b.name)
}

/**
 * 일주 요약 정보 (간략화)
 */
export function getIljuSummary(pillar: string): string | null {
  const info = ILJU_DATA[pillar]
  if (!info) {
    // 데이터가 없으면 기본 설명 생성
    const pillarInfo = getPillarInfo(pillar)
    if (!pillarInfo) {
      return null
    }

    return `${pillarInfo.koreanName}일주: ${pillarInfo.stemElement}일간이 ${pillarInfo.branchElement}지지 위에 있는 형상.`
  }

  return `${pillar}일주: ${info.personality.substring(0, 50)}...`
}

/**
 * 공망(空亡) 계산
 * 특정 갑자의 공망 지지 2개 반환
 */
export function getGongmang(pillar: string): [string, string] | null {
  const index = SIXTY_PILLARS.indexOf(pillar)
  if (index === -1) {
    return null
  }

  // 10개 단위로 순환 (갑자~계유, 갑술~계미, ...)
  const groupStart = Math.floor(index / 10) * 10
  const usedBranches = SIXTY_PILLARS.slice(groupStart, groupStart + 10).map((p) => p[1])

  // 사용되지 않은 지지 2개가 공망
  const gongmang = BRANCH_ORDER.filter((b) => !usedBranches.includes(b))
  return [gongmang[0], gongmang[1]]
}
