/**
 * 가격 줄 — 'From 1 credit · Credits from $4.99' (ko '1크레딧부터 · 크레딧은 ₩5,900부터')
 * + /pricing 링크. 숫자는 전부 SSOT 에서: 1회 비용은 CREDIT_COSTS(creditCosts.ts), 최저가는
 * creditsFromLabel(pricing.ts — 첫구매 한정 starter 제외, 표시 통화 = 청구 통화).
 * 서버·클라이언트 공용.
 */

import Link from 'next/link'
import { CREDIT_COSTS } from '@/lib/config/creditCosts'
import { creditsFromLabel } from '@/lib/config/pricing'
import { PRICE, fill, pick, type Lang } from './v9Copy'
import s from './PriceLine.module.css'

interface PriceLineProps {
  locale: Lang
  /** 1회 크레딧 — 기본 상담사 1턴(CREDIT_COSTS.counselorTurn). */
  cost?: number
  /** 요금제 링크를 붙일지. 기본 true. */
  showLink?: boolean
  theme?: 'light' | 'dark'
  className?: string
}

export default function PriceLine({
  locale,
  cost = CREDIT_COSTS.counselorTurn,
  showLink = true,
  theme = 'light',
  className,
}: PriceLineProps) {
  const from = fill(pick(cost === 1 ? PRICE.fromCredit : PRICE.fromCredits, locale), { n: cost })
  const packs = fill(pick(PRICE.creditsFrom, locale), { price: creditsFromLabel(locale) })
  return (
    <p
      className={[s.line, theme === 'dark' ? s.dark : '', className].filter(Boolean).join(' ')}
      data-price-line=""
    >
      <span className={s.cost}>{from}</span>
      <span className={s.sep} aria-hidden="true">
        ·
      </span>
      <span className={s.nw}>{packs}</span>
      {showLink ? (
        <Link href="/pricing" className={s.link}>
          {pick(PRICE.seePricing, locale)}
        </Link>
      ) : null}
    </p>
  )
}
