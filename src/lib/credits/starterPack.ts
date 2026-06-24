/**
 * 첫구매 한정 스타터팩 자격 판정 (계정당 평생 1회).
 *
 * 자격 = (1) Stripe Price 가 설정돼 결제 가능하고 (STRIPE_PRICE_CREDIT_STARTER)
 *        (2) 사용자가 실제 결제(source='purchase') 이력이 없을 것.
 * 리퍼럴/프로모/기프트 지급은 '구매'로 치지 않는다.
 *
 * 이 모듈은 자격 API(/api/me/starter-eligibility)와 체크아웃 서버 강제
 * (/api/checkout) 양쪽에서 공유된다 — UI 표시와 결제 생성이 같은 규칙을 쓰게.
 */

import { prisma } from '@/lib/db/prisma'
import { CREDIT_PACKS } from '@/lib/config/pricing'
import { getCreditPackPriceId } from '@/lib/payments/prices'

export const STARTER_PACK = CREDIT_PACKS.starter

/** 스타터팩이 애초에 판매 가능한 상태인가 (Stripe Price 설정됨). */
export function isStarterConfigured(): boolean {
  return getCreditPackPriceId('starter') !== null
}

/** 사용자가 실제 결제(source='purchase')를 한 적이 있는가. */
export async function hasMadePurchase(userId: string): Promise<boolean> {
  const existing = await prisma.bonusCreditPurchase.findFirst({
    where: { userId, source: 'purchase' },
    select: { id: true },
  })
  return existing !== null
}

/** 서버 권위 자격: 설정됨 AND 첫구매(구매 이력 없음). */
export async function isStarterEligible(userId: string): Promise<boolean> {
  if (!isStarterConfigured()) return false
  return !(await hasMadePurchase(userId))
}
