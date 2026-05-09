/**
 * Advanced Saju Analysis for Compatibility
 * 심화 사주 분석: 십성, 신살, 육합/삼합/충/형/파/해, 용신, 희신 등
 *
 * This file has been refactored into smaller modules in the saju/ directory.
 * All exports are re-exported from ./saju for backwards compatibility.
 *
 * Module Structure:
 * - saju/types.ts: All type definitions
 * - saju/element-utils.ts: Element utility functions
 * - saju/ten-gods.ts: 십성(十星) 분석
 * - saju/shinsals.ts: 신살(神殺) 분석
 * - saju/harmonies-conflicts.ts: 합(合) 및 충형파해(沖刑破害) 분석
 * - saju/yongsin.ts: 용신/희신 궁합 분석
 * - saju/daeun-seun.ts: 대운/세운 흐름 비교
 * - saju/gongmang.ts: 공망(空亡) 분석
 * - saju/ganhap.ts: 천간합(天干合) 분석
 * - saju/gyeokguk.ts: 격국(格局) 비교
 * - saju/twelve-states.ts: 12운성(十二運星) 분석
 * - saju/comprehensive.ts: 종합 분석
 */

// Re-export everything from the saju module for backwards compatibility
export * from './saju';

// Re-export SajuProfile type for convenience
export type { SajuProfile } from './cosmicCompatibility';
