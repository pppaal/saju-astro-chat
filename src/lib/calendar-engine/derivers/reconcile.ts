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
 * 발동 신호 = `reasonNet`: topReasons/cautions 를 만드는 바로 그 층(월·일·시·정점)의
 * impact(polarity×weight×layerWeight) 합. *부호*만 본다 — 차트마다 절대 크기가
 * 달라도 "점수 밴드의 낙관 방향과 큐레이션된 사유의 net 방향이 어긋나는가"는
 * 차트 독립적이다. (옛 구현은 |polarity|≥2 신호의 *절대 개수*로 판단했는데, 하루
 * 신호가 100~190개라 길·흉 강신호가 항상 수십 개씩 있어 매일 발동 → 모든 날이
 * 'mixed' 로 뭉개지는 버그였다. 부호 기반으로 교정.)
 */

import { CALENDAR_BANDS } from './constants'

export type DayBand = 'good' | 'mid' | 'low'
export type DayTone = 'positive' | 'mixed' | 'caution'

export interface DayToneInput {
  /** 사용자에게 실제 보여주는 점수(day.score = favorScore ?? derivedScore). */
  score: number
  /**
   * 큐레이션 사유 층(월·일·시·정점)의 impact 합(polarity×weight×layerWeight).
   * 부호만 사용: >0 우호 우세, <0 주의 우세. summary.ts 의 topReasons/cautions 와
   * 같은 모집단·같은 가중이라 "칩이 실제로 어느 쪽으로 기우는가"를 대표한다.
   */
  reasonNet: number
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
  /** 낙관 밴드(good/mid)인데 큐레이션 사유가 net 주의로 기욺 → 한 단계 낮춤. */
  tense: boolean
  /** 주의 밴드(low)인데 큐레이션 사유가 net 우호로 기욺 → 한 단계 올림. */
  bright: boolean
}

/** 보여주는 점수 → 밴드. 월 그리드·연 티어와 *같은 단일 밴드*(CALENDAR_BANDS). */
export function scoreToBand(score: number): DayBand {
  if (score >= CALENDAR_BANDS.good) return 'good'
  if (score >= CALENDAR_BANDS.caution) return 'mid'
  return 'low'
}

/**
 * 점수 밴드 + 큐레이션 사유 net → 화해된 verdict.
 *
 * tense: 낙관 밴드(good/mid)인데 사유 net 이 음(주의 우세)이거나, 보여줄 게
 *        '조심할 것'뿐 → 한 단계 낮춰 헤드라인이 거짓 확신을 주지 않게.
 * bright: 주의 밴드(low)인데 사유 net 이 양(우호 우세)이거나, 보여줄 게
 *         '좋은 것'뿐 → 한 단계 올려 "전부 나쁘다"는 거짓 인상을 막음.
 *
 * 정상 차트에선 좋은날 net>0 / 나쁜날 net<0 라 대개 발동하지 않고 밴드 톤을 그대로
 * 유지한다 — 화해는 *밴드와 사유가 실제로 어긋날 때만* 개입하는 안전망이다.
 */
export function reconcileDayTone(input: DayToneInput): DayVerdict {
  const band = scoreToBand(input.score)

  const tense =
    (band === 'good' || band === 'mid') &&
    (input.reasonNet < 0 || (input.hasCautionReason && !input.hasGoodReason))

  const bright =
    band === 'low' &&
    (input.reasonNet > 0 || (input.hasGoodReason && !input.hasCautionReason))

  let tone: DayTone = band === 'good' ? 'positive' : band === 'mid' ? 'mixed' : 'caution'
  if (tense && tone === 'positive') tone = 'mixed'
  if (bright && tone === 'caution') tone = 'mixed'

  return { band, tone, tense, bright }
}
