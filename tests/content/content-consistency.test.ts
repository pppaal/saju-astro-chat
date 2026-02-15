import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SUPPORT_EMAIL } from '@/lib/config/contact'

function readUtf8(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('content consistency guardrails', () => {
  it('uses one support email source of truth', () => {
    expect(SUPPORT_EMAIL).toBe('support@destinypal.com')
  })

  it('keeps pricing FAQ/refund phrasing aligned in English copy', () => {
    const enMisc = JSON.parse(readUtf8('src/i18n/locales/en/misc.json')) as {
      pricing: { monthlyResetDesc: string; guaranteeDesc: string; faqs: { a2: string; a5: string } }
    }

    expect(enMisc.pricing.monthlyResetDesc.toLowerCase()).toContain('billing cycle')
    expect(enMisc.pricing.faqs.a2.toLowerCase()).toContain('billing cycle')
    expect(enMisc.pricing.faqs.a5.toLowerCase()).toContain('unused credit packs')
    expect(enMisc.pricing.faqs.a5.toLowerCase()).toContain('7 days')
    expect(enMisc.pricing.guaranteeDesc.toLowerCase()).toContain('first-time')
  })

  it('keeps pricing FAQ/refund phrasing aligned in Korean copy', () => {
    const koMisc = JSON.parse(readUtf8('src/i18n/locales/ko/misc.json')) as {
      pricing: { monthlyResetDesc: string; guaranteeDesc: string; faqs: { a2: string; a5: string } }
    }

    expect(koMisc.pricing.monthlyResetDesc).toContain('결제 주기')
    expect(koMisc.pricing.faqs.a2).toContain('3개월')
    expect(koMisc.pricing.faqs.a5).toContain('7일')
    expect(koMisc.pricing.guaranteeDesc).toContain('최초 구독')
  })

  it('avoids unlimited-reading claim on FAQ page', () => {
    const faqPage = readUtf8('src/app/faq/page.tsx').toLowerCase()
    expect(faqPage).not.toContain('unlimited readings')
  })

  it('policy pages do not contain personal gmail addresses', () => {
    const terms = readUtf8('src/app/policy/terms/page.tsx').toLowerCase()
    const privacy = readUtf8('src/app/policy/privacy/page.tsx').toLowerCase()
    const refund = readUtf8('src/app/policy/refund/page.tsx').toLowerCase()

    expect(terms).not.toContain('gmail.com')
    expect(privacy).not.toContain('gmail.com')
    expect(refund).not.toContain('gmail.com')
  })

  it('pricing and premium reports entry copy remain conversion-ready', () => {
    const pricingClient = readUtf8('src/app/pricing/PricingPageClient.tsx')
    const premiumReportsPage = readUtf8('src/app/premium-reports/page.tsx')

    expect(pricingClient).toContain('startFree')
    expect(pricingClient.toLowerCase()).not.toContain('unlimited readings')
    expect(premiumReportsPage).toContain('premium-reports')
  })
})
