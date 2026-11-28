/**
 * tryThis — 월 화면 "이렇게 해보세요"(PUSH/HOLD) 날짜 선택의 단일 소스.
 *
 * 월간 화면의 '해 볼 것'(monthViewModel → TryThis)이 이 함수만 읽어, *이미 지난 날* 을
 * 추천하지 않게 한다(계획 B1 #3 — 예전엔 HOLD 가 cautionDays[0] 이라 19일에 "11/8 무렵엔
 * 미루세요", PUSH 도 지난 최고일을 그대로 가리켰다). 옛 이달 총평(deriveMonthSummary)도
 * 같은 함수를 읽었다 — 그 문단은 D9 에서 페이로드째 지웠다.
 *
 * 규칙:
 *   · "앞으로" = 기준일(보통 오늘) 이후, 기준일 포함. 'MM-DD' 문자열 비교.
 *   · PUSH = bestDay 가 앞으로면 그 날, 아니면 앞으로 남은 첫 good 날, 없으면 null.
 *   · HOLD = HOLD_PRIORITY 순서로 앞으로 남은 첫 avoid/caution 날, 없으면 null.
 *     기본 'avoid-first'(피할 날 먼저 — 오너 결정, decisions.md §5).
 *     'caution-first' 는 FIX9b E6 대안(조심할 날 먼저).
 *
 * 순수 함수 — 날짜·시계 읽기 없음. 기준일은 호출부가 주입한다(결정론 규약).
 */

/** HOLD 후보 우선순위. */
export type HoldPriority = 'avoid-first' | 'caution-first'

/** 오너 결정(decisions.md §5 — plan 기본값): 피할 날을 먼저 짚는다. */
export const HOLD_PRIORITY: HoldPriority = 'avoid-first'

/**
 * 'MM-DD' 목록에서 기준일(포함) 이후 가장 이른 날. 없으면 null.
 * 기준일이 빈 문자열이면 모든 날이 "앞으로"다(기준일 미상 — 가장 이른 날).
 * 목록 순서에 기대지 않는다(최솟값).
 */
export function firstUpcoming(
  list: ReadonlyArray<string> | null | undefined,
  todayMMDD: string
): string | null {
  let first: string | null = null
  for (const d of list ?? []) {
    if (!d || d < todayMMDD) continue
    if (first === null || d < first) first = d
  }
  return first
}

export interface TryThisInput {
  /** 그리드 '최고의 날' 'MM-DD' — 크라운이 없으면 빈 문자열/undefined. */
  bestDay?: string | null
  goodDays?: ReadonlyArray<string> | null
  cautionDays?: ReadonlyArray<string> | null
  avoidDays?: ReadonlyArray<string> | null
}

export interface TryThis {
  /** 밀어붙일 날 'MM-DD' — 앞으로 남은 날이 없으면 null(절 생략). */
  push: string | null
  /** 미룰 날 'MM-DD' — 앞으로 남은 날이 없으면 null(절 생략). */
  hold: string | null
}

export function pickTryThis(
  input: TryThisInput,
  todayMMDD: string,
  opts: { holdPriority?: HoldPriority } = {}
): TryThis {
  const best = input.bestDay || ''
  const push = best && best >= todayMMDD ? best : firstUpcoming(input.goodDays, todayMMDD)
  const holdPriority = opts.holdPriority ?? HOLD_PRIORITY
  const avoid = firstUpcoming(input.avoidDays, todayMMDD)
  const caution = firstUpcoming(input.cautionDays, todayMMDD)
  const hold = holdPriority === 'avoid-first' ? (avoid ?? caution) : (caution ?? avoid)
  return { push, hold }
}

/** 'YYYY-MM' + 일(day-of-month) → 'MM-DD'. 일이 없거나 0 이하면 '' (모든 날이 앞으로). */
export function toMMDD(ym: string, day: number | null | undefined): string {
  if (!day || day <= 0 || !Number.isFinite(day)) return ''
  return `${ym.slice(5, 7)}-${String(day).padStart(2, '0')}`
}
