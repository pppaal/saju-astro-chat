/**
 * messageBilling — "N 메시지당 1 credit" 공통 정책.
 *
 * 타로 followup / 운명 상담사 / 궁합 상담사 셋이 똑같이
 *   Q1 → charge 1   (Q1·Q2 커버)
 *   Q2 → free
 *   Q3 → charge 1   (Q3·Q4 커버)
 *   ...
 * 로 동작하도록 통일. 운명 상담사가 쓰던 "세션 30분/20턴 = 1 credit"
 * 모델은 worst case 적자라 제거하고, 짧고 예측 가능한 2-message 사이클로 대체.
 *
 * Redis 키: msg-billing:{feature}:{userId}
 * 24h TTL — 사용자가 하루 안에 돌아오면 "산 free turn" 그대로 유지, 이후엔
 * 리셋 (free turn 무한 누적 방지). 실패 시 in-memory fallback 없음 — Redis
 * 가 죽으면 매 메시지 charge 되는 보수적 동작.
 */

import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'

export const MESSAGES_PER_CREDIT = 2
const FREE_TURN_TTL_SECONDS = 24 * 60 * 60

export type BilledFeature = 'tarot-followup' | 'destiny-counselor' | 'compat-counselor'

function key(feature: BilledFeature, userId: string): string {
  return `msg-billing:${feature}:${userId}`
}

/**
 * 이번 메시지에 credit 을 차감해야 하는지 결정 + 카운터를 1 올린다.
 * 1, 3, 5… 번째 메시지 → true (차감), 2, 4, 6… 번째 → false (이전 차감으로 커버).
 *
 * 호출자가 credit 부족(charge=true 인데 잔액 0) 으로 LLM 호출 안 한 경우
 * 잘못된 카운터 증가를 되돌리려면 rollbackMessageCount() 사용.
 */
export async function shouldChargeForMessage(
  feature: BilledFeature,
  userId: string
): Promise<{ shouldCharge: boolean; messageNumber: number }> {
  const k = key(feature, userId)
  const prev = (await cacheGet<number>(k)) ?? 0
  const next = prev + 1
  await cacheSet(k, next, FREE_TURN_TTL_SECONDS)
  return {
    shouldCharge: next % MESSAGES_PER_CREDIT === 1,
    messageNumber: next,
  }
}

/**
 * shouldChargeForMessage 가 카운터를 올린 뒤 credit 부족·LLM 실패 등으로
 * 실제 응답을 못 줬을 때 카운터를 1 되돌린다 (사용자가 다음에 재시도하면
 * 같은 차감 위치에서 다시 시작).
 */
export async function rollbackMessageCount(feature: BilledFeature, userId: string): Promise<void> {
  const k = key(feature, userId)
  const current = (await cacheGet<number>(k)) ?? 0
  if (current > 0) {
    await cacheSet(k, current - 1, FREE_TURN_TTL_SECONDS)
  }
}
