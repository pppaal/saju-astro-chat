// src/lib/Saju/stemBranchUtils.ts
// 중복된 천간/지지 헬퍼 함수들을 통합한 유틸리티 모듈

import { STEMS, BRANCHES } from './constants';
import type { FiveElement, YinYang, StemBranchInfo } from './types';

// Map으로 O(1) 조회 - 배열 순회 대신 효율적인 검색
const STEM_MAP = new Map<string, StemBranchInfo>(STEMS.map(s => [s.name, s]));
const BRANCH_MAP = new Map<string, StemBranchInfo>(BRANCHES.map(b => [b.name, b]));

// 한글 천간 매핑 (갑을병정무기경신임계)
const KOREAN_STEM_MAP: Record<string, string> = {
  '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊',
  '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸',
};

// 한글 지지 매핑 (자축인묘진사오미신유술해)
const KOREAN_BRANCH_MAP: Record<string, string> = {
  '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', '사': '巳',
  '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥',
};

/**
 * 천간 이름을 표준 한자로 정규화
 * @param stem - 천간 (한자 또는 한글)
 * @returns 정규화된 한자 천간 또는 원본
 */
export function normalizeStem(stem: string): string {
  const s = String(stem ?? '').trim();
  return KOREAN_STEM_MAP[s] ?? s;
}

/**
 * 지지 이름을 표준 한자로 정규화
 * @param branch - 지지 (한자 또는 한글)
 * @returns 정규화된 한자 지지 또는 원본
 */
export function normalizeBranch(branch: string): string {
  const b = String(branch ?? '').trim();
  return KOREAN_BRANCH_MAP[b] ?? b;
}

/**
 * 천간 정보 조회
 * @param stem - 천간 이름 (한자 또는 한글)
 * @returns StemBranchInfo 또는 undefined
 */
export function getStemInfo(stem: string): StemBranchInfo | undefined {
  return STEM_MAP.get(normalizeStem(stem));
}

/**
 * 지지 정보 조회
 * @param branch - 지지 이름 (한자 또는 한글)
 * @returns StemBranchInfo 또는 undefined
 */
export function getBranchInfo(branch: string): StemBranchInfo | undefined {
  return BRANCH_MAP.get(normalizeBranch(branch));
}

/**
 * 천간의 오행 조회
 * @param stem - 천간 이름
 * @returns 오행 (기본값: '토')
 */
export function getStemElement(stem: string): FiveElement {
  return getStemInfo(stem)?.element ?? '토';
}

/**
 * 지지의 오행 조회
 * @param branch - 지지 이름
 * @returns 오행 (기본값: '토')
 */
export function getBranchElement(branch: string): FiveElement {
  return getBranchInfo(branch)?.element ?? '토';
}

/**
 * 천간의 음양 조회
 * @param stem - 천간 이름
 * @returns 음양 (기본값: '양')
 */
export function getStemYinYang(stem: string): YinYang {
  return getStemInfo(stem)?.yin_yang ?? '양';
}

/**
 * 지지의 음양 조회
 * @param branch - 지지 이름
 * @returns 음양 (기본값: '양')
 */
export function getBranchYinYang(branch: string): YinYang {
  return getBranchInfo(branch)?.yin_yang ?? '양';
}

/**
 * 천간이 유효한지 확인
 * @param stem - 천간 이름
 * @returns boolean
 */
export function isValidStem(stem: string): boolean {
  return STEM_MAP.has(normalizeStem(stem));
}

/**
 * 지지가 유효한지 확인
 * @param branch - 지지 이름
 * @returns boolean
 */
export function isValidBranch(branch: string): boolean {
  return BRANCH_MAP.has(normalizeBranch(branch));
}

/**
 * 천간 인덱스 조회 (0-9)
 * @param stem - 천간 이름
 * @returns 인덱스 또는 -1
 */
export function getStemIndex(stem: string): number {
  const normalized = normalizeStem(stem);
  return STEMS.findIndex(s => s.name === normalized);
}

/**
 * 지지 인덱스 조회 (0-11)
 * @param branch - 지지 이름
 * @returns 인덱스 또는 -1
 */
export function getBranchIndex(branch: string): number {
  const normalized = normalizeBranch(branch);
  return BRANCHES.findIndex(b => b.name === normalized);
}

/**
 * 인덱스로 천간 조회
 * @param index - 인덱스 (0-9, 순환)
 * @returns StemBranchInfo
 */
export function getStemByIndex(index: number): StemBranchInfo {
  const normalizedIndex = ((index % 10) + 10) % 10;
  return STEMS[normalizedIndex];
}

/**
 * 인덱스로 지지 조회
 * @param index - 인덱스 (0-11, 순환)
 * @returns StemBranchInfo
 */
export function getBranchByIndex(index: number): StemBranchInfo {
  const normalizedIndex = ((index % 12) + 12) % 12;
  return BRANCHES[normalizedIndex];
}
