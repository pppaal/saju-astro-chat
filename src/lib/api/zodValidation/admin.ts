/**
 * Admin Zod Schemas - 어드민 통계/모니터링 라우트 쿼리 검증
 *
 * 어드민 GET 라우트들은 전부 `?days=N` 하나로 조회 기간을 받는다.
 * 예전엔 parseInt + clamp 로 잘못된 값을 조용히 기본값으로 흡수했는데,
 * 운영자가 오타(days=abc, days=0)를 내면 의도와 다른 기간이 그대로
 * 렌더되는 걸 알아챌 수 없었다 → 잘못된 값은 422 로 명시 거부한다.
 */

import { z } from 'zod'

/** days 쿼리 스키마 팩토리 — 라우트마다 상한/기본값이 달라 파라미터화. */
function createAdminDaysQuerySchema(options: { maxDays: number; defaultDays: number }) {
  return z.object({
    days: z.coerce.number().int().min(1).max(options.maxDays).default(options.defaultDays),
  })
}

/** anomalies / audit-log / funnel / revenue / usage — 1~365일, 기본 30일 */
export const adminDaysQuerySchema = createAdminDaysQuerySchema({ maxDays: 365, defaultDays: 30 })

/** webhook-events — Stripe 이벤트 로그는 단기 모니터링 용도라 1~90일, 기본 7일 */
export const adminWebhookEventsQuerySchema = createAdminDaysQuerySchema({
  maxDays: 90,
  defaultDays: 7,
})

export type AdminDaysQueryValidated = z.infer<typeof adminDaysQuerySchema>
