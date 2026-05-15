/**
 * 점수 → 3단계 등급 매핑.
 *
 * 절대 점수가 아니라 그 사용자 분포의 백분위 기반 임계값.
 *   상위 20% → 길
 *   중간 60% → 평
 *   하위 20% → 흉
 *
 * 매달 보장: 길 ~6일 + 평 ~18일 + 흉 ~6일.
 * 사용자마다 임계값 다름 (자기 분포에 맞춤).
 */

export type GradeKey = 'lucky' | 'neutral' | 'unlucky'

export interface GradeInfo {
  key: GradeKey
  label: '길' | '평' | '흉'
  sub: string
  colorClass: string
  bgClass: string
  borderClass: string
}

export interface GradeThresholds {
  /** 길일 최소 점수 (상위 20% cutoff) */
  luckyMin: number
  /** 흉일 최대 점수 (하위 20% cutoff) */
  unluckyMax: number
}

/** 폴백 임계값 — 분포 데이터 없을 때 */
const FALLBACK: GradeThresholds = { luckyMin: 55, unluckyMax: 45 }

/**
 * 사용자의 점수 배열에서 임계값 계산.
 * 1년치 365일 셀을 받아서 percentile 도출.
 */
export function computeGradeThresholds(scores: number[]): GradeThresholds {
  const valid = scores.filter((s) => typeof s === 'number' && Number.isFinite(s))
  if (valid.length < 5) return FALLBACK
  const sorted = [...valid].sort((a, b) => a - b)
  const lowIdx = Math.floor(sorted.length * 0.2)
  const highIdx = Math.floor(sorted.length * 0.8)
  return {
    luckyMin: sorted[highIdx] ?? FALLBACK.luckyMin,
    unluckyMax: sorted[lowIdx] ?? FALLBACK.unluckyMax,
  }
}

const LUCKY: GradeInfo = {
  key: 'lucky',
  label: '길',
  sub: '받쳐주는 흐름',
  colorClass: 'text-emerald-300',
  bgClass: 'bg-gradient-to-br from-emerald-900/40 to-cyan-900/20',
  borderClass: 'border-emerald-500/30',
}
const NEUTRAL: GradeInfo = {
  key: 'neutral',
  label: '평',
  sub: '보통',
  colorClass: 'text-zinc-300',
  bgClass: 'bg-gradient-to-br from-indigo-950/40 to-zinc-900/40',
  borderClass: 'border-indigo-500/20',
}
const UNLUCKY: GradeInfo = {
  key: 'unlucky',
  label: '흉',
  sub: '신중하게',
  colorClass: 'text-rose-300',
  bgClass: 'bg-gradient-to-br from-rose-900/40 to-zinc-900/40',
  borderClass: 'border-rose-500/40',
}

/**
 * 점수 + 분포 임계값 → 등급.
 * thresholds 없으면 폴백 사용.
 */
export function getGrade(score: number, thresholds: GradeThresholds = FALLBACK): GradeInfo {
  if (score >= thresholds.luckyMin) return LUCKY
  if (score <= thresholds.unluckyMax) return UNLUCKY
  return NEUTRAL
}

/**
 * @deprecated 기존 5단계 호환 alias. 신규 코드는 getGrade 사용.
 */
export function getScoreGrade(score: number): GradeInfo & { label: string } {
  return getGrade(score)
}
