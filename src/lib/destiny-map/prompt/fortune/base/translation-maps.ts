/**
 * Korean Translation Maps for Saju/Four Pillars
 * 사주 간지 한글 변환 맵
 *
 * This module provides mappings and utilities for converting Chinese characters
 * (Heavenly Stems and Earthly Branches) to easy-to-read Korean format.
 */

/**
 * Heavenly Stems (天干) to Korean mapping
 * 천간 → 쉬운 한글 변환
 *
 * Format: "한글이름(오행+양음)"
 * - 갑목(나무+): Yang Wood
 * - 을목(나무-): Yin Wood
 * - 병화(불+): Yang Fire
 * - 정화(불-): Yin Fire
 * - 무토(흙+): Yang Earth
 * - 기토(흙-): Yin Earth
 * - 경금(쇠+): Yang Metal
 * - 신금(쇠-): Yin Metal
 * - 임수(물+): Yang Water
 * - 계수(물-): Yin Water
 */
export const stemToKorean: Record<string, string> = {
  '甲': '갑목(나무+)',
  '乙': '을목(나무-)',
  '丙': '병화(불+)',
  '丁': '정화(불-)',
  '戊': '무토(흙+)',
  '己': '기토(흙-)',
  '庚': '경금(쇠+)',
  '辛': '신금(쇠-)',
  '壬': '임수(물+)',
  '癸': '계수(물-)',
};

/**
 * Earthly Branches (地支) to Korean mapping
 * 지지 → 쉬운 한글 변환
 *
 * Format: "한글이름(띠/오행)"
 * - 자(쥐/물): Rat/Water
 * - 축(소/흙): Ox/Earth
 * - 인(호랑이/나무): Tiger/Wood
 * - 묘(토끼/나무): Rabbit/Wood
 * - 진(용/흙): Dragon/Earth
 * - 사(뱀/불): Snake/Fire
 * - 오(말/불): Horse/Fire
 * - 미(양/흙): Sheep/Earth
 * - 신(원숭이/쇠): Monkey/Metal
 * - 유(닭/쇠): Rooster/Metal
 * - 술(개/흙): Dog/Earth
 * - 해(돼지/물): Pig/Water
 */
export const branchToKorean: Record<string, string> = {
  '子': '자(쥐/물)',
  '丑': '축(소/흙)',
  '寅': '인(호랑이/나무)',
  '卯': '묘(토끼/나무)',
  '辰': '진(용/흙)',
  '巳': '사(뱀/불)',
  '午': '오(말/불)',
  '未': '미(양/흙)',
  '申': '신(원숭이/쇠)',
  '酉': '유(닭/쇠)',
  '戌': '술(개/흙)',
  '亥': '해(돼지/물)',
};

/**
 * Format Ganji (干支) to easy-to-read Korean format
 * 간지를 쉬운 한글 형태로 변환
 *
 * Combines Heavenly Stem and Earthly Branch into readable format.
 *
 * @param stem - Heavenly Stem (天干) in Chinese character
 * @param branch - Earthly Branch (地支) in Chinese character
 * @returns Formatted Korean string like "갑목(나무+) + 자(쥐/물)"
 *
 * @example
 * ```typescript
 * formatGanjiEasy('甲', '子') // "갑목(나무+) + 자(쥐/물)"
 * formatGanjiEasy('丙', '午') // "병화(불+) + 오(말/불)"
 * formatGanjiEasy(undefined, '子') // "-"
 * ```
 */
export function formatGanjiEasy(stem?: string, branch?: string): string {
  if (!stem || !branch) return '-';
  const stemKo = stemToKorean[stem] || stem;
  const branchKo = branchToKorean[branch] || branch;
  return `${stemKo} + ${branchKo}`;
}

/**
 * Parse Ganji string and convert to easy Korean format
 * 간지 문자열을 파싱하여 쉬운 한글로 변환
 *
 * Takes a 2-character Ganji string (e.g., "甲子") and converts it to
 * readable Korean format using the translation maps.
 *
 * @param ganji - Two-character Ganji string (天干地支)
 * @returns Formatted Korean string
 *
 * @example
 * ```typescript
 * parseGanjiEasy('甲子') // "갑목(나무+) + 자(쥐/물)"
 * parseGanjiEasy('丙午') // "병화(불+) + 오(말/불)"
 * parseGanjiEasy('X')    // "X" (returns as-is if invalid)
 * parseGanjiEasy()       // "-" (returns dash if undefined)
 * ```
 */
export function parseGanjiEasy(ganji?: string): string {
  if (!ganji || ganji.length < 2) return ganji || '-';
  const stem = ganji[0];
  const branch = ganji[1];
  return formatGanjiEasy(stem, branch);
}
