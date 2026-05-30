import type { ActiveSignal, CalendarCell, SignalLayer } from '../types'

/**
 * 출처별 축 점수(sajuAxis / astroAxis) + 비보상 결합 헤드라인.
 *
 * 기존 캘린더의 "계산기 4개 모순"(헤드라인=derivedScore, 사주축=UltraPrecision,
 * 점성축=transit, 교차=claim-IIFE) 을 단일 출처로 대체하기 위한 점수층.
 * 모든 축·헤드라인·교차가 **같은 신호 다발**에서 나오므로 "축은 aligned인데
 * 교차 28%" 류 모순이 구조적으로 불가능.
 *
 * 설계 근거(검증/리서치): docs/timing-method.md
 *  - 점성 홍수(소행성·미드포인트 등 150+/일) → 단순평균 시 축이 죽음(sd≈0.03).
 *    → "종류(kind)별 비보상 집계": 레이어 안에서 종류별 평균 후, 종류를 중요도로
 *    합산. 600 소행성이 600표가 아니라 1표(작게)가 되어 개수 홍수가 원천 해소.
 *  - 보정은 윈도우 의존(같은 날이 보는 창에 따라 점수 달라짐) + 이상치/소표본에
 *    z-score(scale=k/sd)가 폭발 → **median + MAD(강건) + scale 상한**.
 *  - 결합은 산술평균이 "엇갈림(0,10)"을 "평범(5)"으로 뭉개 타이밍 신호를 파괴 →
 *    **비보상(부호별 기하평균)**: 같은 방향이면 불균형 패널티, 반대면 중립으로.
 */

const LAYER_WEIGHT: Record<SignalLayer, number> = {
  decadal: 1.0,
  yearly: 0.85,
  monthly: 0.7,
  daily: 0.55,
  hourly: 0.4,
  instant: 0.5,
}

/**
 * 신호 종류(kind) 중요도 — 비보상 집계에서 "종류 1표"의 가중.
 * 메이저(트랜짓·식·리턴·일진 기둥십신 등)=1, 이색 잔결(소행성·미드포인트·하모닉·
 * 항성·아라빅·드라코닉)=0.15. 명시 안 된 kind 는 0.5.
 */
const KIND_TIER: Record<string, number> = {
  // astro 메이저
  transit: 1, eclipse: 1, lifecycle: 1, 'solar-return': 1, 'lunar-return': 1,
  'progressed-moon': 1, 'angle-contact': 1, 'planetary-hour': 1,
  // astro 중간
  progression: 0.5, 'solar-arc': 0.5, profection: 0.5, 'zodiacal-releasing': 0.5,
  'moon-phase': 0.5, 'house-transit': 0.5, electional: 0.5, 'void-of-course': 0.5,
  // astro 잔결(홍수원)
  asteroid: 0.15, midpoint: 0.15, harmonic: 0.15, 'fixed-star': 0.15,
  'arabic-part': 0.15, draconic: 0.15,
}
const kindTier = (kind: string): number => KIND_TIER[kind] ?? 0.5

/**
 * 비보상 per-kind 집계 → raw 방향값(-3~+3) 또는 null(신호 없음).
 * 레이어 안에서 종류별 가중평균 → 종류들을 kindTier 로 가중합 → 레이어를 LAYER_WEIGHT 로.
 */
export function sourceGrandAvg(signals: ActiveSignal[]): number | null {
  if (signals.length === 0) return null
  const byLayer = new Map<SignalLayer, ActiveSignal[]>()
  for (const s of signals) {
    const arr = byLayer.get(s.layer) ?? []
    arr.push(s)
    byLayer.set(s.layer, arr)
  }
  let layerWeightedSum = 0
  let layerWeightTotal = 0
  for (const [layer, arr] of byLayer) {
    // 종류별 가중평균
    const byKind = new Map<string, { sum: number; weight: number }>()
    for (const s of arr) {
      if (s.polarity === 0) continue // 길흉 0(소행성 +0 등)은 평균·분모에서 제외(희석 방지)
      const acc = byKind.get(s.kind) ?? { sum: 0, weight: 0 }
      acc.sum += s.polarity * s.weight
      acc.weight += s.weight
      byKind.set(s.kind, acc)
    }
    let kindWeightedSum = 0
    let kindTierTotal = 0
    for (const [kind, acc] of byKind) {
      if (acc.weight === 0) continue
      const kAvg = acc.sum / acc.weight // 그 종류의 평균 polarity
      if (Math.abs(kAvg) < 0.01) continue // net 0(+1/−1 상쇄 등)인 종류는 분모 희석 방지
      const t = kindTier(kind)
      kindWeightedSum += kAvg * t
      kindTierTotal += t
    }
    if (kindTierTotal === 0) continue
    const layerAvg = kindWeightedSum / kindTierTotal
    const lw = LAYER_WEIGHT[layer] ?? 0.5
    layerWeightedSum += layerAvg * lw
    layerWeightTotal += lw
  }
  return layerWeightTotal ? layerWeightedSum / layerWeightTotal : null
}

// ── 강건 통계 ──
function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
function mad(xs: number[], med: number): number {
  if (!xs.length) return 0
  return median(xs.map((x) => Math.abs(x - med)))
}

/** raw 방향값 분포를 0~100 으로 펴는 폭(중앙값 ± 이 정도가 50±TARGET).
 *  12는 너무 보수적이라 "확실히 좋은/나쁜 날"이 안 나옴(전부 47~62) → 22로
 *  확대(좋은날 65+/나쁜날 35- 가 실제로 생김, 옛 엔진 22~89 수준의 변별). */
const TARGET_SPREAD = 22
/** scale 폭발 방지: MAD 가 작아도 이 이상 못 커짐. */
const MAX_SCALE = 150
/** MAD 바닥값(이보다 작으면 신호 변별 거의 없음 → 폭발 차단). 0.03은 너무 낮아
 *  짧은 창에서 scale 수백배 폭주(축 0/100 양극화) → 0.18로 상향. */
const MIN_ROBUST = 0.18
/** 표본 부족(짧은 창) 시 MAD 추정 자체가 불안정 → 보정 보류, 고정 보수 scale. */
const MIN_SAMPLES = 7
const DEFAULT_SCALE = 16

export interface AxisCalibration {
  // median 기준 위/아래를 따로 스케일 — 사주 raw처럼 한쪽 꼬리가 긴 비대칭 분포에서
  // 대칭 scale을 쓰면 긴 꼬리(낮은 날)가 0으로 짜부라져 양극화(opposed↑)됨.
  sajuBias: number; sajuScaleUp: number; sajuScaleDn: number
  astroBias: number; astroScaleUp: number; astroScaleDn: number
}

const quantile = (sorted: number[], p: number): number => {
  if (!sorted.length) return 0
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)))]
}

// median 위쪽/아래쪽을 각각 분위 폭으로 환산 — TARGET_SPREAD 점이 50±가 되도록.
// 위(p90−med)와 아래(med−p10)를 따로 보고, 작은 쪽(robust)으로 scale.
function sidedScales(xs: number[], med: number): { up: number; dn: number } {
  if (xs.length < MIN_SAMPLES) return { up: DEFAULT_SCALE, dn: DEFAULT_SCALE }
  const s = [...xs].sort((a, b) => a - b)
  const upSpread = Math.max(MIN_ROBUST, quantile(s, 0.9) - med)
  const dnSpread = Math.max(MIN_ROBUST, med - quantile(s, 0.1))
  return {
    up: Math.min(MAX_SCALE, TARGET_SPREAD / upSpread),
    dn: Math.min(MAX_SCALE, TARGET_SPREAD / dnSpread),
  }
}

/**
 * 고정 기준 창(빌드된 cells 전체)에서 출처별 보정값 1회 산출.
 * 모든 셀이 이 보정으로 환산되므로, 어느 뷰로 잘라 봐도 같은 날 = 같은 점수.
 */
export function calibrateAxes(cells: CalendarCell[]): AxisCalibration {
  const sRaw: number[] = []
  const aRaw: number[] = []
  for (const c of cells) {
    const s = sourceGrandAvg(c.signals.filter((x) => x.source === 'saju'))
    const a = sourceGrandAvg(c.signals.filter((x) => x.source === 'astro'))
    if (s != null) sRaw.push(s)
    if (a != null) aRaw.push(a)
  }
  const sMed = median(sRaw)
  const aMed = median(aRaw)
  const sS = sidedScales(sRaw, sMed)
  const aS = sidedScales(aRaw, aMed)
  return {
    sajuBias: sMed, sajuScaleUp: sS.up, sajuScaleDn: sS.dn,
    astroBias: aMed, astroScaleUp: aS.up, astroScaleDn: aS.dn,
  }
}

const clamp = (x: number): number => Math.max(0, Math.min(100, Math.round(x)))

/**
 * 비보상 결합 — 50 중심 보존.
 *  - 같은 방향(둘 다 +/둘 다 −): 부호별 기하평균 → 불균형 패널티(한쪽 약하면 끌림).
 *  - 반대 방향(엇갈림): 절반 감쇠 평균 → 중립(50)으로 (충돌은 타이밍 아님).
 */
function nonCompensatoryCombine(a: number, b: number): number {
  const da = a - 50
  const db = b - 50
  if (da === 0 || db === 0) return clamp(50 + (da + db) / 2)
  if (Math.sign(da) === Math.sign(db)) {
    return clamp(50 + Math.sign(da) * Math.sqrt(Math.abs(da) * Math.abs(db)))
  }
  return clamp(50 + ((da + db) / 2) * 0.5)
}

export type AxisAgreement = 'aligned' | 'mixed' | 'opposed'

export interface CellAxes {
  sajuAxis: number
  astroAxis: number
  headline: number
  agreement: AxisAgreement
}

/**
 * 한 셀의 신호 → 두 축 + 비보상 헤드라인 + 일치도.
 * cal 은 calibrateAxes(cells) 로 1회 산출한 고정 보정.
 */
export function deriveCellAxes(signals: ActiveSignal[], cal: AxisCalibration): CellAxes {
  const sg = sourceGrandAvg(signals.filter((x) => x.source === 'saju'))
  const ag = sourceGrandAvg(signals.filter((x) => x.source === 'astro'))
  const sided = (raw: number | null, bias: number, up: number, dn: number): number => {
    if (raw == null) return 50
    const d = raw - bias
    return clamp(50 + d * (d >= 0 ? up : dn))
  }
  const sajuAxis = sided(sg, cal.sajuBias, cal.sajuScaleUp, cal.sajuScaleDn)
  const astroAxis = sided(ag, cal.astroBias, cal.astroScaleUp, cal.astroScaleDn)
  const headline = nonCompensatoryCombine(sajuAxis, astroAxis)
  const gap = Math.abs(sajuAxis - astroAxis)
  const agreement: AxisAgreement = gap <= 12 ? 'aligned' : gap <= 28 ? 'mixed' : 'opposed'
  return { sajuAxis, astroAxis, headline, agreement }
}
