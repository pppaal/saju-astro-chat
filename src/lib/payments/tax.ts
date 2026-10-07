// src/lib/payments/tax.ts
//
// Stripe Tax 설정 SSOT — **표시 문구와 실제 청구가 갈리지 않게** 한다.
//
// 배경: /pricing 은 "VAT 포함 / Tax included" 를 **무조건** 렌더했다. 국내 원화
// 가격은 실제로 VAT 포함이라 맞는 말이지만,
//   · 해외 판매에 세금을 전혀 걷지 않는 상태에서 "Tax included" 는 걷지도 않는
//     세금을 포함했다고 말하는 것이고,
//   · Stripe Tax 를 켜고 Price 를 `exclusive` 로 두면 결제 시 세금이 **가산**돼
//     화면의 $9.99 보다 총액이 커진다.
// 후자는 직전 두 커밋(통화 불일치·환불 수수료)과 같은 "표시 ≠ 청구" 사고다.
// 그래서 문구를 설정에서 끌어오게 해, Price 의 tax_behavior 와 한 몸으로 묶는다.
//
// **중요**: `STRIPE_TAX_BEHAVIOR` 는 Stripe Price 에 실제로 설정한
// `tax_behavior` 와 **반드시 일치**해야 한다. 코드가 Price 설정을 바꾸지는
// 못하므로, 둘을 맞추는 건 운영 책임이다(.env.example 에 명시).

export type TaxBehavior = 'inclusive' | 'exclusive'

/**
 * Stripe Tax(자동 세금 계산) 사용 여부.
 *
 * 기본 false — 켜지지 않은 동안은 기존 동작(세금 계산 없음, 원화 VAT 포함
 * 관행)과 완전히 동일하다. 해외 판매를 시작하기 전에 켜야 한다: EU·UK 는
 * 비거주 판매자의 디지털 서비스에 등록 면세점이 없다.
 */
export function isAutomaticTaxEnabled(): boolean {
  return process.env.STRIPE_TAX_ENABLED === 'true'
}

/**
 * 가격에 세금이 포함인가(inclusive), 결제 시 가산인가(exclusive).
 *
 * 기본 inclusive — 이 제품은 소액 충동구매라 "화면 숫자 = 최종 결제액" 을
 * 지키는 쪽이 전환에 유리하고, 이 세션에서 계속 지켜온 표시==청구 원칙과도
 * 맞는다. 대가로 EU VAT(17~27%)가 매출에서 빠진다(엔진 실비 마진 86~90% 라
 * 감당 가능한 범위).
 */
export function taxBehavior(): TaxBehavior {
  return process.env.STRIPE_TAX_BEHAVIOR === 'exclusive' ? 'exclusive' : 'inclusive'
}

/**
 * 가격 옆에 붙는 세금 문구 — **결제창에서 실제로 벌어지는 일**을 말한다.
 *
 * inclusive  → 화면 금액이 최종 금액. "VAT 포함 / Tax included"
 * exclusive  → 결제 시 세금 가산. 화면 금액보다 총액이 커진다는 걸 반드시 알린다.
 */
export function taxNote(locale: 'ko' | 'en', behavior: TaxBehavior = taxBehavior()): string {
  if (behavior === 'exclusive') {
    return locale === 'ko' ? '세금 별도 (결제 시 가산)' : 'Tax added at checkout'
  }
  return locale === 'ko' ? 'VAT 포함' : 'Tax included'
}

/**
 * Checkout Session 에 올릴 세금 관련 파라미터.
 *
 * automatic_tax 는 고객 위치를 알아야 계산되므로 청구지 주소를 필수로 받는다
 * (EU 디지털 서비스는 고객 소재지 증빙 자체가 요구사항이기도 하다). Customer 를
 * 항상 만들어 주소·세금 정보가 영수증과 환불에 붙게 한다.
 *
 * 세금이 꺼져 있으면 주소 수집도 'auto' 로 둔다 — 안 쓰는 정보를 필수로 받아
 * 결제 이탈을 만들 이유가 없다.
 */
export function taxSessionParams(): {
  automatic_tax: { enabled: boolean }
  billing_address_collection: 'auto' | 'required'
  customer_creation?: 'always'
} {
  const enabled = isAutomaticTaxEnabled()
  return {
    automatic_tax: { enabled },
    billing_address_collection: enabled ? 'required' : 'auto',
    ...(enabled ? { customer_creation: 'always' as const } : {}),
  }
}
