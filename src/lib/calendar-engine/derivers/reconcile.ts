/**
 * 출력 화해(reconciliation) — 점수 밴드 ↔ 실제 신호/사유 톤의 모순 제거.
 *
 * 배경: 날짜 뷰는 *서로 다른 모집단·다른 공식*으로 만든 3개 축을 한 카드에 함께
 * 띄운다 —
 *   1) day.score : 일진(daily+hourly+instant) 층 signed-surprise 를 *그 빌드
 *      청크 분포로 정규화*한 **상대 백분위** (layeredScore.daily).
 *   2) topReasons / cautions : 월+일+시+정점 층의 impact(|polarity|×weight×layer)
 *      랭킹 (summary.ts) — score 와 층·공식이 다르다.
 *   3) oneLine : 또 다른 점수(cell.derivedScore, 6층 전부)에서 파생.
 * 화해 단계가 없어 "순풍(좋은날)" 헤드라인 밑에 '조심할 것' 칩만 뜨거나, 상대
 * 백분위로 '좋은날'인데 절대 신호는 흉(凶)으로 쏠리는 모순이 났다.
 *
 * 이 모듈은 *사용자에게 실제 보여주는 점수*와 *실제 보여주는 신호/사유*를 하나의
 * verdict 로 묶어, 헤드라인·한줄·칩이 같은 톤을 말하도록 조정한다(단일 권위).
 * 점수 값 자체는 건드리지 않는다 — 등급 분포·golden 불변, **서술 톤만 화해**한다.
 *
 * 기존 DayTier 의 `midButStrongNeg → 기복 큰 날` ad-hoc 보정(중 밴드 한정)을
 * 모든 밴드로 일반화한 정본이다.
 */

export type DayBand = 'good' | 'mid' | 'low'
export type DayTone = 'positive' | 'mixed' | 'caution'

/** 강한 신호로 치는 polarity 임계 — |polarity| ≥ STRONG_POLARITY. */
export const STRONG_POLARITY = 2

/** 톤을 한 단계 갉아먹/끌어올리는 강한 신호 최소 개수. */
const STRONG_SIGNAL_FLIP = 2

export interface DayToneInput {
  /** 사용자에게 실제 보여주는 점수(day.score = favorScore ?? derivedScore). */
  score: number
  /** 강한 길신호 수 (polarity ≥ +STRONG_POLARITY). */
  strongPos: number
  /** 강한 흉신호 수 (polarity ≤ −STRONG_POLARITY). */
  strongNeg: number
  /** 보여줄 '좋은 것' 사유가 있는지 (topReasons 비어있지 않음). */
  hasGoodReason: boolean
  /** 보여줄 '조심할 것' 사유가 있는지 (cautions 비어있지 않음). */
  hasCautionReason: boolean
}

export interface DayVerdict {
  /** 보여주는 점수의 밴드. */
  band: DayBand
  /** 헤드라인·한줄·칩이 함께 따라야 할 화해된 톤. */
  tone: DayTone
  /** 낙관 밴드(good/mid)인데 강한 흉신호·주의 사유가 이를 갉아먹음. */
  tense: boolean
  /** 주의 밴드(low)인데 강한 길신호·우호 사유로 살릴 구석이 있음. */
  bright: boolean
}

/** 보여주는 점수 → 밴드. DayTier 의 헤드라인 기준(60/35)과 동일하게 유지. */
export function scoreToBand(score: number): DayBand {
  if (score >= 60) return 'good'
  if (score >= 35) return 'mid'
  return 'low'
}

/** polarity 배열에서 강한 길/흉 신호 수 카운트(보여주는 신호 전체 기준). */
export function countStrong(polarities: readonly number[]): {
  strongPos: number
  strongNeg: number
} {
  let strongPos = 0
  let strongNeg = 0
  for (const p of polarities) {
    if (p >= STRONG_POLARITY) strongPos++
    else if (p <= -STRONG_POLARITY) strongNeg++
  }
  return { strongPos, strongNeg }
}

/**
 * 점수 밴드 + 실제 신호/사유 → 화해된 verdict.
 *
 * tense: 낙관 밴드인데 (강한 흉신호 ≥2) 또는 (보여줄 게 '조심할 것'뿐) → 한 단계
 *        낮춰 헤드라인이 "밀어붙여" 같은 거짓 확신을 주지 않게 한다.
 * bright: 주의 밴드인데 (강한 길신호 ≥2) 또는 (보여줄 게 '좋은 것'뿐) → 한 단계
 *         올려 "전부 나쁘다"는 거짓 인상을 막는다.
 */
export function reconcileDayTone(input: DayToneInput): DayVerdict {
  const band = scoreToBand(input.score)

  const tense =
    (band === 'good' || band === 'mid') &&
    (input.strongNeg >= STRONG_SIGNAL_FLIP || (input.hasCautionReason && !input.hasGoodReason))

  const bright =
    band === 'low' &&
    (input.strongPos >= STRONG_SIGNAL_FLIP || (input.hasGoodReason && !input.hasCautionReason))

  let tone: DayTone = band === 'good' ? 'positive' : band === 'mid' ? 'mixed' : 'caution'
  if (tense && tone === 'positive') tone = 'mixed'
  if (bright && tone === 'caution') tone = 'mixed'

  return { band, tone, tense, bright }
}
