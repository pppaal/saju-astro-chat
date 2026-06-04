/**
 * currentAge — 사주·점성 화면이 표시하는 "현재 나이"의 단일 출처.
 *
 * 정책 (2026-06): 사주/점성 전체를 *만 나이* 한 컨벤션으로 통일 — 2023년
 * 한국 법 개정 후 만 나이가 공식 표준이 됐고, 글로벌(한국·미국·아프리카)
 * 사용자가 동일 숫자를 보도록. 옛 currentKoreanAge 헬퍼는 제거됐다.
 *
 * birthTimeZone 을 *필수* 인자로 받는다 — UTC 폴백 허용 시 자정 경계 사용자가
 * 화면마다 ±1 보이는 회귀가 다시 생기기 때문.
 */

interface ManAgeOpts {
  birthYear: number
  /** 1-12 (Date 와 동일 1-base, *not* 0-base). */
  birthMonth: number
  /** 1-31. */
  birthDate: number
  /** IANA 시간대 (예: "Asia/Seoul"). 빈 문자열·undefined 금지. */
  birthTimeZone: string
  /** 테스트·결정적 스냅샷용 주입. 기본값 = 호출 시점. */
  now?: Date
}

/**
 * 만 나이. 출생 *시간대* 기준 현재 연도/월/일에서 생일 통과 여부까지 반영.
 *
 * Profection (calculateProfection 의 age 인자), 대운 매칭, 표시 등 사주/점성
 * 전 화면에서 사용. 패스포트에 적히는 그 나이.
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
