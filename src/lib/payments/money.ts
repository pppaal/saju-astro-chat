// src/lib/payments/money.ts
//
// 금액 단위를 **타입으로** 강제한다 — 컴파일러가 전제를 지키게 한다.
//
// 왜: 이 레포에서 같은 버그가 반복됐다. "A 에서 맞는 규칙을 B 에 복붙했는데
// B 에선 전제가 깨짐", 그리고 **틀려도 결과가 그럴듯해서** 테스트도 사람도
// 못 본다. 금액에서 그 전제는 *단위*다.
//
//   packAmount('standard','KRW') → 12900   // KRW 는 0-decimal → minor == major
//   packAmount('standard','USD') → 9.99    // ← MAJOR(달러)
//   formulaFeeMinorUnits(amount)           // ← MINOR(센트) 기대
//   session.amount_total                   // ← MINOR
//
// 전부 `number` 라 섞어도 통과한다. 섞으면 100배 틀린 금액이 조용히 나간다
// (`formatMinorUnits(9.99,'USD')` → "$0.10"). 실제 사고도 이 계열이었다:
// 원화 고정 수수료 300 이 USD 결제에 $3.00 으로 붙어 작은 팩 환불이 실패했다.
//
// 브랜디드 타입으로 **대입 자체를 막는다.** 산술은 브랜드를 벗기므로(TS 특성)
// 헬퍼를 거쳐야 다시 붙는다 — 그 지점이 "단위를 의도적으로 정한 곳"이 된다.
// Stripe 응답처럼 외부에서 들어오는 raw number 는 `asMinor` 로 한 번만 단언하고,
// 그 호출부가 곧 감사 지점이다(grep 가능).

/**
 * 0-decimal 통화 — 최소 단위가 곧 기본 단위다(₩1 = 1, 하위 단위 없음).
 * Stripe 공식 목록. https://docs.stripe.com/currencies#zero-decimal
 *
 * 단위 변환의 근거라 **금액 모듈이 소유**한다(수수료 모듈이 아니라).
 */
export const ZERO_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
])

/** 결제 통화의 **최소 단위** — KRW 1원, USD 1센트. Stripe API 와 같은 단위. */
export type Minor = number & { readonly __moneyUnit: 'minor' }

/** 사람이 말하는 **기본 단위** — ₩12,900, $9.99. 표시·정가 테이블용. */
export type Major = number & { readonly __moneyUnit: 'major' }

/** 기본 단위 1 당 최소 단위 수 — KRW 1, USD 100. */
export function minorPerMajor(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? 1 : 100
}

/**
 * 외부 raw number 를 최소 단위로 **단언**한다. Stripe `amount_total`,
 * `balance_transaction.amount`, DB `amountMinor` 처럼 이미 최소 단위인 값에만 쓴다.
 * 이 함수 호출부가 곧 "단위를 내가 보증한 지점" — 감사할 때 여기만 보면 된다.
 */
export function asMinor(n: number): Minor {
  return n as Minor
}

/** 정가 테이블처럼 기본 단위인 raw number 를 단언한다. */
export function asMajor(n: number): Major {
  return n as Major
}

/** 기본 → 최소. USD $9.99 → 999, KRW ₩12,900 → 12900. */
export function toMinor(amount: Major, currency: string): Minor {
  return Math.round(amount * minorPerMajor(currency)) as Minor
}

/** 최소 → 기본. USD 999 → 9.99, KRW 12900 → 12900. */
export function toMajor(amount: Minor, currency: string): Major {
  return (amount / minorPerMajor(currency)) as Major
}

/** 최소 단위 덧셈 — 브랜드를 유지한다(산술이 브랜드를 벗기는 걸 막는 통로). */
export function addMinor(a: Minor, b: Minor): Minor {
  return (a + b) as Minor
}

/** 최소 단위 뺄셈. 음수 방지는 호출자 책임(환불은 0 하한을 따로 둔다). */
export function subMinor(a: Minor, b: Minor): Minor {
  return (a - b) as Minor
}

/** 최소 단위의 퍼센트 — 반올림해 최소 단위로 돌려준다. */
export function pctOfMinor(amount: Minor, percent: number): Minor {
  return Math.round(amount * (percent / 100)) as Minor
}

/** 0 이상으로 클램프. 환불액이 음수가 되지 않게. */
export function clampMinor(amount: Minor): Minor {
  return Math.max(0, amount) as Minor
}

/** 최소 단위 금액 표시. KRW ₩1,234 / USD $12.34 */
export function formatMinor(amount: Minor, currency: string): string {
  const code = currency.toUpperCase()
  const value = toMajor(amount, currency)
  if (code === 'KRW') return `₩${Math.round(value).toLocaleString('ko-KR')}`
  if (code === 'USD') return `$${value.toFixed(2)}`
  return `${value.toFixed(minorPerMajor(currency) === 1 ? 0 : 2)} ${code}`
}

/** 기본 단위 금액 표시 — 정가 그리드용(packAmount 결과). */
export function formatMajor(amount: Major, currency: string): string {
  const code = currency.toUpperCase()
  if (code === 'KRW') return `₩${Math.round(amount).toLocaleString('ko-KR')}`
  if (code === 'USD') return `$${amount.toFixed(2)}`
  return `${amount.toFixed(minorPerMajor(currency) === 1 ? 0 : 2)} ${code}`
}
