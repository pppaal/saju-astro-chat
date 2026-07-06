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
   * *그날 고유* 층(TONE_LAYERS: daily·instant)의 impact 합(polarity×weight×
   * layerWeight). 부호만 사용: >0 우호 우세, <0 주의 우세.
   *
   * 월운(monthly)·시진(hourly)은 넣지 않는다 — 월운은 한 달 내내 같은 상수라
   * 좋은 달엔 매일 양수 베이스를 깔고, 시진은 12시진 합이라 항상 양수로 쏠려,
   * 그날 자체가 흉이어도 net>0 이 되어 bright 승격이 상시 발동했다(실측: 저점일
   * 25일 중 23일). 점수(layered.daily)가 그날의 상대 위치를 말하므로, 화해도
   * 그날의 신호로 판정해야 점수와 문장이 같은 방향을 본다.
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
  /**
   * mixed 결 — 'volatile'(기복, tense/bright 로 실제 조정된 날) vs 'flat'(평이,
   * 두드러진 신호 없는 중간밴드). 여기서 *1회* 산출해 verdict 에 실어, 표면들이
   * 각자 tense/bright 로 다시 계산하다 어긋나는 것(감사 U1·#2)을 원천 차단한다.
   */
  flavor: 'volatile' | 'flat'
  /**
   * 이 verdict 를 만든 *보여주는 점수*(favorScore ?? derivedScore). 밴드 색과
   * 공유-후크의 72점 컷이 별도 day.score 읽기 없이 verdict 만의 순수 함수가 되게
   * 실어 둔다(감사 #3: 72 임계가 SSOT 밖 네 번째 매직넘버였다).
   */
  score: number
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
    band === 'low' && (input.reasonNet > 0 || (input.hasGoodReason && !input.hasCautionReason))

  let tone: DayTone = band === 'good' ? 'positive' : band === 'mid' ? 'mixed' : 'caution'
  if (tense && tone === 'positive') tone = 'mixed'
  if (bright && tone === 'caution') tone = 'mixed'

  // flavor 는 여기서 한 번만 — 'volatile'(기복, 실제 조정됨) vs 'flat'(평이). mixed 가
  // 두 상황(점수↔신호 어긋나 화해된 날 vs 그냥 중간밴드)을 뭉뚱그려, 예전엔 슬롯마다
  // '평이'/'기복' 으로 갈려 모순이 났다(U1). verdict 에 실어 표면 재계산을 없앤다.
  const flavor: 'volatile' | 'flat' = tense || bright ? 'volatile' : 'flat'

  return { band, tone, tense, bright, flavor, score: input.score }
}

/**
 * mixed 톤의 결 — 이제 verdict.flavor 를 그대로 읽는다(단일 산출점: reconcileDayTone).
 * 예전엔 표면마다 tense/bright 로 다시 계산해 어긋났다(감사 U1·#2). 하위호환 유지용
 * 헬퍼 — 새 코드는 `verdict.flavor` 를 직접 읽는 게 낫다.
 */
export function mixedFlavor(v: DayVerdict): 'volatile' | 'flat' {
  return v.flavor
}

// ── 월(月) verdict — 한 달 톤의 단일 권위 ──────────────────────────────────────

/** 월 톤 4분류. good(좋은날 우세) · care(조심날 우세) · volatile(둘 다 있고 균형=
 *  기복) · flat(둘 다 없음=평이/고른). */
export type MonthTone = 'good' | 'care' | 'volatile' | 'flat'
/** 공유카드/후크용 톤 별칭 — MonthTone 과 1:1. */
export type MonthShareTone = 'bright' | 'careful' | 'mixed' | 'steady'

export interface MonthCounts {
  /** 좋은 날 수(good 밴드). */
  goodN: number
  /** 조심 날 수(caution 밴드). */
  cautionN: number
  /** 피하는 날 수(avoid 밴드). */
  avoidN: number
  /** 그 달 전체 날 수. */
  totalN: number
}

export interface MonthVerdict {
  /** 히어로·톤워드·총평·공유카드가 다 따라야 할 단일 월 톤. */
  tone: MonthTone
  /** 공유/후크용 별칭(tone→map). */
  shareTone: MonthShareTone
  goodN: number
  /** 조심-측 합 = cautionN + avoidN. 표면이 각자 더하지 않게 실어 둔다. */
  careN: number
  cautionN: number
  avoidN: number
  totalN: number
}

/**
 * 월 카운트 → 단일 월 verdict. 예전엔 이 4분류 공식이 MonthTier(noviceTone)와
 * monthSummary(tone+isFlat) 두 곳에 복붙돼 주석으로만 "동일 공식"을 강제했다
 * (감사 D-1: 한쪽 임계만 바뀌면 히어로 칩과 총평 문단이 조용히 어긋남). 여기 한
 * 곳에서만 판정한다.
 *
 * good  : 좋은날이 조심날의 2배 이상(그리고 >0) — 확실히 순한 달.
 * care  : 조심날이 좋은날보다 많음 — 조심스러운 달.
 * flat  : 좋은날·조심날 둘 다 0 — 중간밴드만 가득한 평이/고른 달.
 * volatile: 나머지(둘 다 있고 균형) — 기복 있는 달.
 */
export function reconcileMonthTone(counts: MonthCounts): MonthVerdict {
  const { goodN, cautionN, avoidN, totalN } = counts
  const careN = cautionN + avoidN
  const tone: MonthTone =
    goodN >= careN * 2 && goodN > 0
      ? 'good'
      : careN > goodN
        ? 'care'
        : goodN === 0 && careN === 0
          ? 'flat'
          : 'volatile'
  const shareTone: MonthShareTone =
    tone === 'good' ? 'bright' : tone === 'care' ? 'careful' : tone === 'flat' ? 'steady' : 'mixed'
  return { tone, shareTone, goodN, careN, cautionN, avoidN, totalN }
}
