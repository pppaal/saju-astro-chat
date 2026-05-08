/**
 * Confidence Calculator - 분석 신뢰도 계산 모듈
 *
 * 사주 정보의 완전성에 따른 신뢰도 점수를 계산합니다.
 */

import type { UserSajuProfile } from '../types';

// ═══════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════

export interface ConfidenceInput {
  sajuProfile: UserSajuProfile;
  crossVerified: boolean;
}

export interface ConfidenceResult {
  confidence: number;
  confidenceNote: string;
}

// ═══════════════════════════════════════════════════════════
// 상수
// ═══════════════════════════════════════════════════════════

const CONFIDENCE_SCORES = {
  base: 60,
  timePillar: 15,
  daeunCycles: 10,
  yongsin: 10,
  crossVerified: 5,
  max: 100,
} as const;

// ═══════════════════════════════════════════════════════════
// 신뢰도 계산 함수
// ═══════════════════════════════════════════════════════════

export function calculateConfidence(input: ConfidenceInput): ConfidenceResult {
  const { sajuProfile, crossVerified } = input;

  let confidenceBase = CONFIDENCE_SCORES.base;
  const confidenceNotes: string[] = [];

  // 시주(時柱) 정보 존재 여부
  if (sajuProfile.pillars?.time) {
    confidenceBase += CONFIDENCE_SCORES.timePillar;
  } else {
    confidenceNotes.push('시주 없음');
  }

  // 대운(大運) 정보 존재 여부
  if (sajuProfile.daeunCycles && sajuProfile.daeunCycles.length > 0) {
    confidenceBase += CONFIDENCE_SCORES.daeunCycles;
  } else {
    confidenceNotes.push('대운 정보 없음');
  }

  // 용신(用神) 정보 존재 여부
  if (sajuProfile.yongsin) {
    confidenceBase += CONFIDENCE_SCORES.yongsin;
  } else {
    confidenceNotes.push('용신 정보 없음');
  }

  // 교차 검증 보너스
  if (crossVerified) {
    confidenceBase += CONFIDENCE_SCORES.crossVerified;
  }

  const confidence = Math.min(confidenceBase, CONFIDENCE_SCORES.max);
  const confidenceNote = confidenceNotes.length > 0
    ? `제한: ${confidenceNotes.join(', ')}`
    : '완전한 분석';

  return { confidence, confidenceNote };
}
