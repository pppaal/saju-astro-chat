// src/lib/prediction/modules/eventScoring.ts
// 사건 유형별 점수 계산 모듈

import { normalizeScore } from '../utils/scoring-utils'
import type { EventCategoryScores } from './types'

// ============================================================
// 사건 유형별 점수 계산
// ============================================================

/**
 * 사건 유형별 세부 점수 계산
 */
export function calculateEventCategoryScores(
  sibsin: string,
  twelveStage: string,
  branchInteractions: Array<{ type: string; score: number }>,
  shinsals: Array<{ name: string; type: 'lucky' | 'unlucky' }>,
  yongsinActive: boolean,
  kisinActive: boolean
): EventCategoryScores {
  const baseScore = 50

  // 십신별 영역 보정
  const sibsinModifiers: Record<string, Partial<EventCategoryScores>> = {
    정관: { career: 20, relationship: 10 },
    편관: { career: 15, health: -10 },
    정재: { finance: 20, relationship: 10 },
    편재: { finance: 15, travel: 10 },
    정인: { education: 20, health: 10 },
    편인: { education: 15, travel: 10 },
    식신: { health: 15, finance: 10 },
    상관: { education: 10, career: -10 },
    비견: { relationship: 10, finance: -5 },
    겁재: { finance: -15, relationship: -10 },
  }

  // 12운성별 보정
  const stageModifiers: Record<string, Partial<EventCategoryScores>> = {
    장생: { education: 10, health: 10 },
    목욕: { relationship: 10, travel: 10 },
    관대: { career: 10, relationship: 5 },
    건록: { career: 15, finance: 10 },
    제왕: { career: 20, finance: 15 },
    쇠: { health: -5, career: -5 },
    병: { health: -15, career: -10 },
    사: { health: -20, finance: -15 },
    묘: { health: -10, career: -15 },
    절: { career: -10, relationship: -10 },
    태: { education: 5, relationship: 5 },
    양: { education: 10, health: 5 },
  }

  const scores: EventCategoryScores = {
    career: baseScore,
    finance: baseScore,
    relationship: baseScore,
    health: baseScore,
    travel: baseScore,
    education: baseScore,
  }

  // 십신 보정 적용
  const sibsinMod = sibsinModifiers[sibsin] || {}
  for (const [key, value] of Object.entries(sibsinMod)) {
    scores[key as keyof EventCategoryScores] += value as number
  }

  // 12운성 보정 적용
  const stageMod = stageModifiers[twelveStage] || {}
  for (const [key, value] of Object.entries(stageMod)) {
    scores[key as keyof EventCategoryScores] += value as number
  }

  // 지지 상호작용 보정
  for (const inter of branchInteractions) {
    const bonus = inter.score * 0.5
    if (inter.type.includes('합')) {
      scores.relationship += bonus
      scores.career += bonus * 0.5
    } else if (inter.type.includes('충')) {
      scores.relationship -= Math.abs(bonus)
      scores.travel += Math.abs(bonus) * 0.5 // 충은 이동운
    }
  }

  // 신살 보정
  for (const shinsal of shinsals) {
    if (shinsal.type === 'lucky') {
      if (shinsal.name === '천을귀인') {
        scores.career += 15
        scores.relationship += 10
      } else if (shinsal.name === '역마') {
        scores.travel += 20
        scores.career += 5
      } else if (shinsal.name === '문창') {
        scores.education += 15
      }
    } else {
      if (shinsal.name === '겁살') {
        scores.finance -= 15
        scores.health -= 10
      } else if (shinsal.name === '백호') {
        scores.health -= 20
      }
    }
  }

  // 용신/기신 전체 보정
  if (yongsinActive) {
    for (const key of Object.keys(scores)) {
      scores[key as keyof EventCategoryScores] += 10
    }
  }
  if (kisinActive) {
    for (const key of Object.keys(scores)) {
      scores[key as keyof EventCategoryScores] -= 8
    }
  }

  // 0-100 범위로 정규화
  for (const key of Object.keys(scores)) {
    scores[key as keyof EventCategoryScores] = normalizeScore(
      scores[key as keyof EventCategoryScores]
    )
  }

  return scores
}
