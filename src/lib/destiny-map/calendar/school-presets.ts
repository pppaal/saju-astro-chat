// 학파별 캘린더 가중치 preset.
//
// 한국·중국 사주 명리는 학파마다 강조점이 다름:
//   자평진전(子平眞詮): 격국·용신 본질 중시. 신살은 보조.
//   적천수(滴天髓):     일간 강약·통근·합화 중시. 격국 덜 강조.
//   강호(江湖):         신살 강조. 일진·당일 변동 중시.
//
// 각 학파 사용자가 자기 익숙한 가중치로 점수를 받게 하는 opt-in 프리셋.
// 기본은 v4 (균형) — 학파 미지정 시 그대로.

export type SchoolPreset = 'default' | 'japing' | 'jeokcheonsu' | 'gangho'

interface SajuWeights {
  daeun: number
  seun: number
  wolun: number
  iljin: number
  yongsin: number
  total: 50
}

/**
 * 학파별 사주 50점 재배분.
 * total은 항상 50. astro 50점은 학파 무관하게 동일.
 */
export const SCHOOL_SAJU_WEIGHTS: Record<SchoolPreset, SajuWeights> = {
  // 기본 (v4 균형) — 본질 비중 회복 + 일진 안정
  default: {
    daeun: 8,
    seun: 10,
    wolun: 7,
    iljin: 15,
    yongsin: 10,
    total: 50,
  },
  // 자평진전: 격국·용신 본질 강하게
  japing: {
    daeun: 7,
    seun: 9,
    wolun: 6,
    iljin: 12,
    yongsin: 16, // 본질 가장 큰 비중
    total: 50,
  },
  // 적천수: 시점별 흐름·일진 골고루, 용신은 살짝
  jeokcheonsu: {
    daeun: 10,
    seun: 11,
    wolun: 8,
    iljin: 14,
    yongsin: 7,
    total: 50,
  },
  // 강호: 일진·신살 위주 (당일 변동성 ↑)
  gangho: {
    daeun: 6,
    seun: 8,
    wolun: 6,
    iljin: 22, // 일진 가장 큼
    yongsin: 8,
    total: 50,
  },
}

/**
 * 학파별 교차 보너스. 자평·적천수는 사주 강조라 점성 보너스 약간 낮춤,
 * 강호는 시간 변동 강조라 보너스 그대로.
 */
export const SCHOOL_CROSS_BONUS: Record<SchoolPreset, number> = {
  default: 5,
  japing: 4,
  jeokcheonsu: 4,
  gangho: 5,
}

/**
 * 활성 preset (전역 — 단일 사용자 환경 가정).
 * 멀티테넌트면 컨텍스트로 받게 리팩터.
 */
let activePreset: SchoolPreset = 'default'

export function setSchoolPreset(p: SchoolPreset): void {
  activePreset = p
}

export function getSchoolPreset(): SchoolPreset {
  return activePreset
}

export function getActiveSajuWeights(): SajuWeights {
  return SCHOOL_SAJU_WEIGHTS[activePreset]
}

export function getActiveCrossBonus(): number {
  return SCHOOL_CROSS_BONUS[activePreset]
}

/** 학파별 한국어 라벨 (UI용). */
export const SCHOOL_LABELS: Record<SchoolPreset, string> = {
  default: '균형 (기본)',
  japing: '자평진전 (격국·용신 위주)',
  jeokcheonsu: '적천수 (시점·흐름 위주)',
  gangho: '강호 (일진·신살 위주)',
}
