// Stripe credit-pack 가격 정합성 점검 — 실제 청구가(price ID unit_amount)가
// 우리 CREDIT_PACKS 표시가와 같은지 한 번에 대조한다. 운영 키로 실행:
//   STRIPE_SECRET_KEY=sk_live_... STRIPE_PRICE_CREDIT_MINI=price_... (…) \
//   npx tsx scripts/verify-stripe-prices.ts
// 불일치가 하나라도 있으면 exit 1.
import Stripe from 'stripe'
import { CREDIT_PACKS } from '../src/lib/config/pricing'
import { verifyCreditPackPrice, type CreditPackKey } from '../src/lib/payments/prices'

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.log('⚠️  STRIPE_SECRET_KEY 미설정 — 점검 건너뜀(실제 키로 실행하세요).')
    return
  }
  const stripe = new Stripe(key)
  const packs = Object.keys(CREDIT_PACKS) as CreditPackKey[]

  let mismatches = 0
  let unverified = 0
  console.log('=== Stripe credit-pack 가격 정합성 ===\n')
  for (const pack of packs) {
    const def = CREDIT_PACKS[pack]
    const r = await verifyCreditPackPrice(stripe, pack)
    if (r.status === 'ok') {
      console.log(
        `✅ ${pack.padEnd(9)} ${def.credits}크레딧 — 코드 ₩${def.pricing.krw}/$${def.pricing.usd} = Stripe`
      )
    } else if (r.status === 'mismatch') {
      mismatches++
      console.log(
        `❌ ${pack.padEnd(9)} 불일치(${r.currency}): 코드 기대 ${r.expected} vs Stripe ${r.actual}`
      )
    } else {
      unverified++
      console.log(`❔ ${pack.padEnd(9)} 확인 불가: ${r.reason}`)
    }
  }
  console.log(`\n불일치 ${mismatches}건 · 확인불가 ${unverified}건`)
  if (mismatches > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
