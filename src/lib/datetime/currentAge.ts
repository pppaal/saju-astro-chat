/**
 * currentAge — 사주·점성 화면이 표시하는 "현재 나이"의 단일 출처.
 *
 * 기존 회귀: 5+ 곳에서 각자 `new Date().getUTCFullYear() - birthYear (± 1)` 식으로
 * 따로 계산. 시간대 처리가 곳마다 달라(UTC vs 출생지 vs 한국식 +1 vs 만나이 -1)
 * 같은 사용자한테 화면마다 1살씩 차이나는 회귀가 반복 발생.
 *
 * 두 가지만 노출:
 *   - currentKoreanAge: 한국 나이 (출생 시 1세, 출생지 시간대로 매년 1/1 +1)
 *   - currentManAge:    만 나이 (생일 통과 여부 반영, 출생지 시간대 기준)
 *
 * 두 함수 모두 `birthTimeZone` 을 *필수* 인자로 받는다 — UTC 폴백을 허용하면
 * 이 helper 가 막으려는 바로 그 회귀를 다시 만들기 때문.
 */

interface KoreanAgeOpts {
  birthYear: number
  /** IANA 시간대 (예: "Asia/Seoul"). 빈 문자열·undefined 금지 — UTC 폴백
   *  허용 시 자정 경계 사용자에서 ±1 회귀 발생. */
  birthTimeZone: string
  /** 테스트·결정적 스냅샷용 주입. 기본값 = 호출 시점. */
  now?: Date
}

interface ManAgeOpts extends KoreanAgeOpts {
  /** 1-12 (Date 와 동일 1-base, *not* 0-base). */
  birthMonth: number
  /** 1-31. */
  birthDate: number
}

/**
 * 한국 나이. 출생 *시간대* 기준 현재 연도에서 출생 연도를 빼고 +1.
 *
 * 한국식 컨벤션상 매년 1/1 에 +1 (생일 통과와 무관). 그래서 month/date 인자
 * 불필요 — birthYear 와 birthTimeZone 만 있으면 결정 가능.
 *
 * 예: 1990-01-01 03:00 KST 출생, 지금이 2026-01-01 02:30 KST (UTC 로는 아직
 *     2025-12-31 17:30) → 한국 나이 37. UTC 로 계산하면 36 으로 1살 어긋남.
 */
export function currentKoreanAge(opts: KoreanAgeOpts): number {
  const now = opts.now ?? new Date()
  const localYear = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: opts.birthTimeZone,
      year: 'numeric',
    }).format(now)
  )
  return localYear - opts.birthYear + 1
}

/**
 * 만 나이. 출생 *시간대* 기준 현재 연도/월/일에서 생일 통과 여부까지 반영.
 *
 * Profection (calculateProfection 의 age 인자) 처럼 "완성된 년 수" 가 필요한
 * 자리에 사용. 패스포트에 적히는 그 나이.
 */
export function currentManAge(opts: ManAgeOpts): number {
  const now = opts.now ?? new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: opts.birthTimeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const localYear = get('year')
  const localMonth = get('month')
  const localDay = get('day')
  const hadBirthdayThisYear =
    localMonth > opts.birthMonth ||
    (localMonth === opts.birthMonth && localDay >= opts.birthDate)
  return Math.max(0, localYear - opts.birthYear - (hadBirthdayThisYear ? 0 : 1))
}
