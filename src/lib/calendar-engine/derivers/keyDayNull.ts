/**
 * 운흐름 v3 step 4 — 원형 시프트 null 로 "큰 날(isKeyDay)" 판정.
 *
 * docs/운흐름.md §0.5.2 ④ / §0.5.6 step 4. 84년(또는 한 청크) 전부를 스캔하면 우연
 * 피크가 반드시 난다 → 모든 날에 의미부여 금지. 진짜 큰 날 = "사주 무거움 ⊕ 점성
 * 무거움이 *우연보다 자주* 겹치는 날".
 *
 * 방법:
 *  1) 관측 교차열 observed[i] = combine(saju[i], astro[i]) (기본 min — 둘 다 무거워야 큼).
 *  2) 한 체계(astro)를 **원형 시프트** k(=1..n-1) — 각 스트림의 자기상관(느린 신호의
 *     연속성)은 보존하되 두 체계의 *동시성만* 깬다.
 *  3) 각 시프트마다 교차열의 **최댓값** 을 모아 null 분포 구성 → max-통계라 다중비교
 *     (look-elsewhere)가 자동 보정됨.
 *  4) 임계 = null 최댓값들의 (1−alpha) 분위수. observed[i] > 임계 → isKeyDay.
 *
 * 결정적(난수 없음) — 모든 시프트를 순회. 순수 함수.
 */

export interface KeyDayResult {
  /** 관측 교차열. */
  observed: number[]
  /** look-elsewhere 보정 임계 (null 최댓값 분포의 1−alpha 분위수). */
  threshold: number
  /** observed[i] > threshold. */
  isKeyDay: boolean[]
  /** 0~1 — observed[i] 보다 작은 null 최댓값 비율(클수록 이례적). */
  surprise: number[]
}

export interface KeyDayOptions {
  /** 두 체계 무게 → 교차값. 기본 min(둘 다 무거워야 큼). */
  combine?: (saju: number, astro: number) => number
  /** 유의수준. 기본 0.05. */
  alpha?: number
}

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0
  if (q <= 0) return sortedAsc[0]
  if (q >= 1) return sortedAsc[sortedAsc.length - 1]
  const idx = Math.ceil(q * sortedAsc.length) - 1
  return sortedAsc[Math.min(sortedAsc.length - 1, Math.max(0, idx))]
}

/**
 * @param sajuSeries 일자별 사주 무게(mass) 열.
 * @param astroSeries 같은 길이의 점성 무게 열.
 */
export function circularShiftKeyDays(
  sajuSeries: number[],
  astroSeries: number[],
  opts: KeyDayOptions = {}
): KeyDayResult {
  const n = sajuSeries.length
  const combine = opts.combine ?? ((a, b) => Math.min(a, b))
  const alpha = opts.alpha ?? 0.05

  const observed = sajuSeries.map((s, i) => combine(s, astroSeries[i] ?? 0))

  // n<3 이면 의미있는 원형 시프트가 없음 → 큰 날 없음(보수적).
  if (n < 3) {
    return {
      observed,
      threshold: Infinity,
      isKeyDay: observed.map(() => false),
      surprise: observed.map(() => 0),
    }
  }

  // 각 시프트의 교차열 최댓값 → null 분포.
  const nullMaxes: number[] = []
  for (let k = 1; k < n; k++) {
    let maxVal = -Infinity
    for (let i = 0; i < n; i++) {
      const v = combine(sajuSeries[i], astroSeries[(i + k) % n])
      if (v > maxVal) maxVal = v
    }
    nullMaxes.push(maxVal)
  }
  const sorted = [...nullMaxes].sort((a, b) => a - b)
  const threshold = quantile(sorted, 1 - alpha)
  const denom = nullMaxes.length

  return {
    observed,
    threshold,
    isKeyDay: observed.map((v) => v > threshold),
    surprise: observed.map((v) => sorted.filter((m) => m < v).length / denom),
  }
}
