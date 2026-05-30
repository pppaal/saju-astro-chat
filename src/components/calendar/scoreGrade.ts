/**
 * 점수 → 3단계 등급 매핑.
 *
 * 절대 cutoff. yearlyDates의 scoreToGrade(63/57/44/34) 및 narrative grade와 정렬:
 *   ≥57 → 좋은 날      (grade 0~1)
 *   ≥44 → 보통          (grade 2)
 *   <44 → 조심할 날     (grade 3~4)
 *
 * 분포 percentile 기반(상위/하위 20%)으로 매기던 이전 방식은 narrative grade
 * (절대 cutoff)와 같은 60점 날을 yearly에선 "좋음", daily에선 "보통"으로 분리해서
 * 카드 안 라벨 모순을 만들었다. 한 cutoff로 통일.
 *
 * computeGradeThresholds는 하위호환을 위해 남기되 내부적으로 항상 ABSOLUTE를 반환.
 */

export type GradeKey = 'lucky' | 'neutral' | 'unlucky'

export interface GradeInfo {
  key: GradeKey
  label: '좋은 날' | '보통' | '조심할 날'
  sub: string
  colorClass: string
  bgClass: string
  borderClass: string
  /** Hero 카드 emoji anchor — tier 무관, grade 의미만으로 통일. */
  emoji: string
  /** Hero 카드 전용 깊은 그라데이션 backdrop — 풀폭 시각 임팩트. */
  heroBgClass: string
  /** Hero 카드 glow shadow — 카드 뒤로 grade 색이 번지는 cinematic 효과. */
  heroShadowClass: string
}

export interface GradeThresholds {
  /** 길일 최소 점수 (절대 cutoff) */
  luckyMin: number
  /** 흉일 최대 점수 (절대 cutoff) */
  unluckyMax: number
}

/**
 * 절대 cutoff — yearlyDates.scoreToGrade의 grade≤1 / grade=2 / grade≥3 경계와 일치.
 * 결과: 같은 점수 60이 yearly·daily 어디서나 "좋은 날(grade 1)"로 일관.
 */
const ABSOLUTE: GradeThresholds = { luckyMin: 57, unluckyMax: 43 }

/**
 * @deprecated 분포 기반 임계값은 narrative grade와 어긋나 모순을 만들었음.
 *  항상 절대 cutoff(ABSOLUTE)를 반환. 호출부 제거 시 함께 제거.
 */
export function computeGradeThresholds(_scores: number[]): GradeThresholds {
  return ABSOLUTE
}

// 디자인 톤 정리(2026) — 풀 색 saturated 그라데이션이 "옛날 느낌"이라 채도
// 낮춰 modern flat-glow 로. /30 /40 → /15 /20 / shadow 약화 / 보더 톤 다운.
const LUCKY: GradeInfo = {
  key: 'lucky',
  label: '좋은 날',
  sub: '받쳐주는 흐름',
  colorClass: 'text-emerald-200',
  bgClass: 'bg-gradient-to-br from-emerald-900/40 to-cyan-900/20',
  borderClass: 'border-emerald-400/20',
  emoji: '☀️',
  heroBgClass: 'bg-gradient-to-br from-emerald-500/15 via-zinc-900/60 to-zinc-950',
  heroShadowClass: 'shadow-xl shadow-emerald-500/10',
}
const NEUTRAL: GradeInfo = {
  key: 'neutral',
  label: '보통',
  sub: '잔잔한 흐름',
  colorClass: 'text-zinc-100',
  bgClass: 'bg-gradient-to-br from-indigo-950/40 to-zinc-900/40',
  borderClass: 'border-[rgba(212,181,114,0.15)]',
  emoji: '🌗',
  heroBgClass: 'bg-gradient-to-br from-indigo-500/12 via-zinc-900/60 to-zinc-950',
  heroShadowClass: 'shadow-lg shadow-indigo-500/10',
}
const UNLUCKY: GradeInfo = {
  key: 'unlucky',
  label: '조심할 날',
  sub: '무리하지 않기',
  colorClass: 'text-rose-200',
  bgClass: 'bg-gradient-to-br from-rose-900/40 to-zinc-900/40',
  borderClass: 'border-rose-400/20',
  emoji: '🌙',
  heroBgClass: 'bg-gradient-to-br from-rose-500/15 via-zinc-900/60 to-zinc-950',
  heroShadowClass: 'shadow-xl shadow-rose-500/10',
}

/**
 * 점수 → 등급. thresholds 인자는 하위호환 — 항상 ABSOLUTE 사용.
 * narrative grade(yearlyDates.scoreToGrade)와 같은 cutoff라 카드 안 라벨 일관.
 */
export function getGrade(score: number, _thresholds: GradeThresholds = ABSOLUTE): GradeInfo {
  if (score >= ABSOLUTE.luckyMin) return LUCKY
  if (score <= ABSOLUTE.unluckyMax) return UNLUCKY
  return NEUTRAL
}

// ─────────────────────────────────────────────────────────────
// 별 5단계 (사용자 표시용) — 날숫자(50~70 상대값) 대신 ★로.
//
// 점수가 "그 사람 평소=50" 상대값이라 절대 별컷(예: 80→5별)은 안 맞는다(대부분
// 40~60에 몰려 다 2~3별). → 그 사람 자기 분포의 percentile로 별을 매겨 "평소
// 대비 오늘이 어느 정도인가"를 정직하게 보인다. 분포(그 해/그 달 점수 배열)를
// 넣으면 percentile, 없으면 절대 근사 폴백.
// ─────────────────────────────────────────────────────────────
export interface StarRating {
  stars: 1 | 2 | 3 | 4 | 5
  label: '최고의 날' | '좋은 날' | '보통' | '주의' | '조심할 날'
  /** "올해 상위 12%" 같은 보조 표기 (분포 있을 때만). */
  percentileNote?: string
}

const STAR_LABELS: Record<number, StarRating['label']> = {
  5: '최고의 날',
  4: '좋은 날',
  3: '보통',
  2: '주의',
  1: '조심할 날',
}

/**
 * 점수 → 별 5단계.
 * @param score 그날 점수(0~100 상대값)
 * @param distribution 그 사람 비교 분포(그 해/그 달 점수 배열). 있으면 percentile 기반.
 */
export function getStarRating(score: number, distribution?: number[]): StarRating {
  if (distribution && distribution.length >= 10) {
    const sorted = [...distribution].sort((a, b) => a - b)
    const below = sorted.filter((s) => s < score).length
    const pct = below / sorted.length // 0~1, 내 점수가 분포에서 차지하는 하위 비율
    // 상위 비율 = 1 - pct
    const top = 1 - pct
    let stars: StarRating['stars']
    if (top <= 0.12) stars = 5 // 상위 12%
    else if (top <= 0.32) stars = 4 // 상위 32%
    else if (top >= 0.88) stars = 1 // 하위 12%
    else if (top >= 0.68) stars = 2 // 하위 32%
    else stars = 3
    const topPctRounded = Math.max(1, Math.round(top * 100))
    return {
      stars,
      label: STAR_LABELS[stars],
      percentileNote: stars >= 4 ? `상위 ${topPctRounded}%` : stars <= 2 ? `하위 ${Math.round(pct * 100)}%` : undefined,
    }
  }
  // 분포 없을 때 절대 근사 (보수적)
  let stars: StarRating['stars']
  if (score >= 68) stars = 5
  else if (score >= 57) stars = 4
  else if (score <= 32) stars = 1
  else if (score <= 43) stars = 2
  else stars = 3
  return { stars, label: STAR_LABELS[stars] }
}
