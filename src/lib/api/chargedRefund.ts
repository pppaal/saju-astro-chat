import { refundCreditsOnce } from '@/lib/credits/refundOnce'
import { logger } from '@/lib/logger'

export interface ChargedRefunderConfig {
  // 환불 dedup 키 — 차감 멱등키(scopedIdemKey)와 정렬돼야 차감 1회당 환불 1회.
  // null 이면 refundCreditsOnce 가 합성키로 폴백(같은 시각 충돌 위험 있으니 지양).
  refundKey: string | null
  userId: string
  amount: number
  apiRoute: string
  // 로그 prefix (예: 'counselor/realtime').
  logLabel: string
}

/**
 * 과금된 스트리밍 턴을 최대 1회 환불하는 클로저를 만든다. counselor/realtime ·
 * compatibility/counselor(· 추후 tarot) 가 공유 — 예전엔 각 라우트가 이 로직을
 * 복붙해 두 개의 돈 불변식이 여러 곳에서 손으로 유지되며 드리프트했다:
 *
 *   1) **creditType 은 항상 'reading'.** consumeCredits 는 type 을 무시하고
 *      (creditService `void type`) 언제나 BONUS 풀에서 차감한다. 그런데
 *      refundCredits 의 'compatibility' 분기는 항상 0 인 compatibilityUsed
 *      카운터만 GREATEST(0,-1)=0 으로 건드려 bonusCredits 를 전혀 복원하지 않는
 *      no-op 이었다 — 실패 시 사용자가 크레딧을 영구히 잃는데 감사 로그엔 환불
 *      성공으로 남았다. 그래서 차감이 'compatibility' 여도 환불은 'reading'.
 *
 *   2) **refundKey 로 dedupe.** 한 턴에 여러 경로(스트림 onFailure + pre-stream
 *      outer catch + inner claudeErr catch)가 환불을 시도해도 refundCreditsOnce
 *      가 그 키로 1회만 실제 환불한다 — 자유롭게 여러 번 불러도 안전.
 *
 * `isCharged()` 가 false 면 no-op — idempotent replay/미과금 턴은 환불하지 않는다.
 *
 * @returns `(reason, errorMessage?)` — reason 은 CreditTransaction.reason,
 *   errorMessage 는 감사용 상세(없으면 생략). 실패해도 throw 하지 않는다
 *   (환불 실패가 응답 경로를 깨지 않게 로그만 남긴다).
 */
export function makeChargedRefunder(
  config: ChargedRefunderConfig,
  isCharged: () => boolean
): (reason: string, errorMessage?: string) => Promise<void> {
  return async (reason, errorMessage) => {
    if (!isCharged()) return
    try {
      await refundCreditsOnce(config.refundKey, {
        userId: config.userId,
        creditType: 'reading',
        // 차감과 같은 SSOT 값 — 환불액이 차감액과 어긋나지 않게 호출자가 넘긴다.
        amount: config.amount,
        reason,
        apiRoute: config.apiRoute,
        ...(errorMessage ? { errorMessage } : {}),
      })
    } catch (err) {
      logger.warn(`[${config.logLabel}] refund failed`, { err, reason })
    }
  }
}
