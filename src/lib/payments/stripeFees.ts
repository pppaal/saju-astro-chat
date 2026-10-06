// src/lib/payments/stripeFees.ts
//
// Stripe 결제수수료 계산 SSOT — **통화를 인자로 받는다.**
//
// 버그였던 것: 환불 라우트 두 곳(me/·admin/)이 각자
//   `Math.round(amount * 0.035) + STRIPE_FEE_FIXED_KRW`  // 300
// 를 복붙해 갖고 있었다. Stripe 금액은 **결제 통화의 최소 단위**인데
// (KRW 는 0-decimal 이라 ₩12,900 = 12900, USD 는 2-decimal 이라 $9.99 = 999)
// 고정 수수료만 원화 300 으로 박혀 있어서, USD 결제엔 `+300` 이 **$3.00** 으로
// 붙었다. 실측 영향(공식 폴백 경로):
//
//   starter  $1.99 → 수수료 $3.07  → max(0, 199-307)=0  → 환불 자체가 실패
//   mini     $4.99 → 수수료 $3.17  → $1.82 환불 (63% 차감)
//   standard $9.99 → 수수료 $3.35  → $6.64 환불 (33% 차감)
//
// EU·UK 디지털재 법정 청약철회권과 바로 충돌하는 구간이라, USD Price 를 켜기
// 전에 반드시 통화별로 갈라야 한다.
//
// 이 모듈은 금액을 **최소 단위 그대로** 다룬다(Stripe API 와 같은 단위).
// 환산은 표시 직전에만 한다. 단위는 타입으로 강제한다 — money.ts 참조.

import {
  addMinor,
  asMajor,
  asMinor,
  formatMinor,
  pctOfMinor,
  toMinor,
  type Minor,
} from '@/lib/payments/money'

// 0-decimal 목록·단위 변환은 money.ts(금액 모듈)가 소유한다 — 재노출만 한다.
export { ZERO_DECIMAL_CURRENCIES, minorPerMajor as minorUnitsPerUnit } from '@/lib/payments/money'

/**
 * 고지 문구용 기본 요율 — **클라이언트에서도 쓸 수 있는 상수.**
 * env 오버라이드는 서버 전용이므로, 클라 문구는 이 값을 쓴다.
 */
export const DISPLAY_FEE_PERCENT = 3.5

/** 수수료율(%) — 통화 무관. 계정 요율이 다르면 env 로 덮는다. */
export function feePercent(): number {
  const raw = Number(process.env.STRIPE_FEE_PERCENT)
  return Number.isFinite(raw) && raw >= 0 ? raw : DISPLAY_FEE_PERCENT
}

/**
 * 고정 수수료 — **통화별, 최소 단위**.
 *
 * 기본값: KRW ₩300(=300), USD $0.30(=30). env 로 통화별 덮어쓸 수 있다
 * (`STRIPE_FEE_FIXED_KRW`, `STRIPE_FEE_FIXED_USD`). 모르는 통화는 그 통화의
 * 최소 단위로 0.30 상당 — Stripe 표준 고정 수수료가 대체로 0.30 선이라
 * 과소도 과대도 아닌 쪽으로 둔다.
 */
export function feeFixedMinorUnits(currency: string): Minor {
  const code = currency.toUpperCase()
  const fromEnv = Number(process.env[`STRIPE_FEE_FIXED_${code}`])
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return asMinor(Math.round(fromEnv))
  if (code === 'KRW') return asMinor(300)
  return toMinor(asMajor(0.3), currency)
}

/**
 * 공식 기반 수수료 추정 — **balance_transaction.fee 를 못 읽을 때만** 쓴다.
 * 실제 수수료는 Stripe 가 알려주는 값이 정답이므로 그쪽을 우선한다.
 *
 * @param amountMinor 결제액(최소 단위)
 * @param currency    ISO 4217 (대소문자 무관)
 */
export function formulaFeeMinorUnits(amountMinor: Minor, currency: string): Minor {
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) return asMinor(0)
  return addMinor(pctOfMinor(amountMinor, feePercent()), feeFixedMinorUnits(currency))
}

/** 최소 단위 → 사람이 읽는 금액 문자열. money.ts 의 formatMinor 재노출. */
export { formatMinor as formatMinorUnits } from '@/lib/payments/money'

/**
 * 환불 수수료 고지 문구 — **계산과 같은 출처에서 만든다.**
 *
 * 영문 약관·영문 확인창이 `~3.5% + ₩300` 이라고 원화로 고지하고 있었다(미국
 * 고객에게 원화 수수료를 안내). 소비자 고지는 실제로 떼는 금액과 일치해야
 * 하므로, 문구도 feePercent()·feeFixedMinorUnits() 를 거치게 한다.
 */
export function formatFeeDisclosure(currency: string, locale: 'ko' | 'en'): string {
  const pct = feePercent()
  const fixed = formatMinor(feeFixedMinorUnits(currency), currency)
  return locale === 'ko' ? `약 ${pct}% + ${fixed}` : `~${pct}% + ${fixed}`
}
