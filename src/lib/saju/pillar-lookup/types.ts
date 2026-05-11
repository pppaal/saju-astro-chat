// src/lib/Saju/pillar-lookup/types.ts
// Type definitions for pillar lookup module

import type { FiveElement, YinYang } from '../types'

/**
 * 60갑자 기본 정보
 */
export interface SixtyPillarInfo {
  index: number // 1-60 순번
  pillar: string // 간지 (예: 甲子)
  stem: string // 천간 (예: 甲)
  branch: string // 지지 (예: 子)
  stemKorean: string // 천간 한글 (예: 갑)
  branchKorean: string // 지지 한글 (예: 자)
  koreanName: string // 한글명 (예: 갑자)
  stemElement: FiveElement // 천간 오행
  branchElement: FiveElement // 지지 오행
  stemYinYang: YinYang // 천간 음양
  branchYinYang: YinYang // 지지 음양
  naeum: string // 납음오행
}

/**
 * 일주론(日柱論) 상세 정보
 */
export interface IljuInfo {
  pillar: string
  personality: string
  career: string
  love: string
  wealth: string
  health: string
  famousPeople?: string
}
