#!/usr/bin/env node
/**
 * scripts/mirror-credit-packs-to-test.mjs
 *
 * Stripe TEST mode 에 운영용 5개 크레딧 팩(Product + Price)을 한 번에 미러링한다.
 *
 * 사용법:
 *   STRIPE_SECRET_KEY=sk_test_xxxxx node scripts/mirror-credit-packs-to-test.mjs
 *
 * 안전장치: 키가 sk_test_ 로 시작하지 않으면 즉시 종료. 실수로 live 키로
 * 돌려서 운영에 중복 상품 생기는 것을 막음.
 *
 * 출력: 생성된 Price ID 들을 환경변수 형식으로 stdout 에 찍음.
 *   STRIPE_PRICE_CREDIT_MINI=price_xxx
 *   STRIPE_PRICE_CREDIT_STANDARD=price_xxx
 *   ...
 * 그대로 Vercel Preview env 에 붙여넣으면 됨.
 *
 * idempotency: 이미 같은 metadata.pack_id 가 있는 Product 가 있으면 재사용.
 * 여러 번 돌려도 중복 안 만듦.
 */

import Stripe from 'stripe'

// CREDIT_PACKS — src/lib/config/pricing.ts 와 동일 소스 (CommonJS 의존 회피
// 위해 여기 inline). 변동 시 둘 다 같이 업데이트.
const CREDIT_PACKS = {
  mini: { credits: 5, krw: 1900, usd: 199 },
  standard: { credits: 20, krw: 4900, usd: 499 },
  plus: { credits: 50, krw: 9900, usd: 999 },
  mega: { credits: 120, krw: 19900, usd: 1999 },
  ultimate: { credits: 280, krw: 39900, usd: 3999 },
}

const ENV_KEY_BY_PACK = {
  mini: 'STRIPE_PRICE_CREDIT_MINI',
  standard: 'STRIPE_PRICE_CREDIT_STANDARD',
  plus: 'STRIPE_PRICE_CREDIT_PLUS',
  mega: 'STRIPE_PRICE_CREDIT_MEGA',
  ultimate: 'STRIPE_PRICE_CREDIT_ULTIMATE',
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.error('❌ STRIPE_SECRET_KEY 환경변수 필요.')
    console.error('   사용법: STRIPE_SECRET_KEY=sk_test_xxx node scripts/mirror-credit-packs-to-test.mjs')
    process.exit(1)
  }
  if (!key.startsWith('sk_test_')) {
    console.error('❌ 안전장치: sk_test_ 로 시작하지 않는 키는 거부.')
    console.error(`   받은 prefix: ${key.slice(0, 7)}... — live 키로 추정.`)
    console.error('   Stripe dashboard 의 "View test data" ON 상태에서 발급한 sk_test_... 키를 쓰세요.')
    process.exit(1)
  }

  const stripe = new Stripe(key, { apiVersion: '2024-06-20' })

  console.error('🔍 기존 product/price 확인 중...')
  const envLines = []

  for (const [packId, pack] of Object.entries(CREDIT_PACKS)) {
    const productName = `DestinyPal Credits — ${packId} (${pack.credits} credits)`

    // metadata.pack_id 로 idempotency 보장
    const existingProducts = await stripe.products.search({
      query: `metadata['pack_id']:'${packId}' AND active:'true'`,
    })

    let product
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0]
      console.error(`  ✓ ${packId}: 기존 product 재사용 (${product.id})`)
    } else {
      product = await stripe.products.create({
        name: productName,
        metadata: { pack_id: packId, credits: String(pack.credits) },
      })
      console.error(`  + ${packId}: product 생성 (${product.id})`)
    }

    // KRW Price 만 만들면 충분 (USD 도 필요하면 추가 분기). KRW 는 zero-decimal
    // 통화라 단위가 원 그대로 (Stripe API 는 unit_amount=1900 → ₩1,900).
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 10,
    })
    const samePrice = existingPrices.data.find(
      (p) => p.currency === 'krw' && p.unit_amount === pack.krw && p.recurring === null
    )

    let price
    if (samePrice) {
      price = samePrice
      console.error(`    ✓ price 재사용 (${price.id}, ₩${pack.krw})`)
    } else {
      price = await stripe.prices.create({
        product: product.id,
        currency: 'krw',
        unit_amount: pack.krw,
        metadata: { pack_id: packId, credits: String(pack.credits) },
      })
      console.error(`    + price 생성 (${price.id}, ₩${pack.krw})`)
    }

    envLines.push(`${ENV_KEY_BY_PACK[packId]}=${price.id}`)
  }

  console.error('')
  console.error('✅ 완료. 아래를 Vercel Preview 의 Environment Variables 에 붙여넣으세요:')
  console.error('   (Production 에는 절대 붙이지 말 것 — 운영은 sk_live_ 키와 짝이 맞아야 함)')
  console.error('')
  console.log(`STRIPE_SECRET_KEY=${key}`)
  for (const line of envLines) console.log(line)
  console.error('')
  console.error('그 다음 Stripe dashboard (test mode) → Developers → Webhooks:')
  console.error('  1) Add endpoint')
  console.error('  2) URL: https://<your-preview-url>/api/webhook/stripe')
  console.error('  3) Events: checkout.session.completed, charge.refunded')
  console.error('  4) Signing secret(whsec_...) 복사해서 STRIPE_WEBHOOK_SECRET 으로 추가')
  console.error('')
  console.error('테스트 카드: 4242 4242 4242 4242 / 미래 만료일 / CVC 아무 3자리')
}

main().catch((err) => {
  console.error('❌ 실패:', err.message)
  if (err.raw) console.error('   Stripe error:', err.raw.message)
  process.exit(1)
})
