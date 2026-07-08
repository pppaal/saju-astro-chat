/**
 * Funnel Event Beacon
 *
 * POST /api/track/funnel  { event }
 *
 * 클라이언트(무료 리포트 결과 화면·CTA 클릭)에서 부르는 경량 퍼널 비콘.
 * 서버 인메모리 카운터(recordCounter)는 클라에서 직접 못 부르므로, 화이트리스트된
 * 이벤트만 받아 `funnel.<event>` 카운터로 집계한다(Prometheus/OTLP 스크랩).
 *
 * 카디널리티 폭주를 막으려고 event 는 고정 allowlist 로만 받는다 — 임의 문자열
 * 금지. best-effort 라 실패해도 사용자 페이지에 영향 주지 않게 200 으로 흡수한다.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiMiddleware,
  createSimpleGuard,
  apiSuccess,
  type ApiContext,
} from '@/lib/api/middleware'
import { recordCounter } from '@/lib/metrics/index'

export const dynamic = 'force-dynamic'

// 허용 이벤트 — 무료 퍼널 단계. 새 단계는 여기 추가해야만 집계된다.
const FUNNEL_EVENTS = [
  'integrated_report.viewed',
  'integrated_report.counselor_cta',
  'compat_free.report_viewed',
  'compat_free.counselor_cta',
  'referral.link_clicked',
  // 바이럴 루프 계측 — trackFunnel.ts 의 FunnelEvent 와 동일하게 유지.
  'compat_free.share_clicked',
  'compat_free.share_link',
  'compat_free.share_image',
  'compat_free.share_kakao',
  'compat_free.invite_landed',
  'compat_free.invite_prefilled',
  'compat_free.invite_converted',
  'integrated_report.share_clicked',
  'integrated_report.invite_landed',
  'integrated_report.invite_converted',
] as const

const funnelSchema = z.object({ event: z.enum(FUNNEL_EVENTS) })

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const raw = await req.json().catch(() => ({}))
    const parsed = funnelSchema.safeParse(raw)
    // 형식 불일치(허용 외 이벤트 등)는 422 대신 조용히 흡수 — 비콘 best-effort.
    if (!parsed.success) return apiSuccess({ skipped: true } as Record<string, unknown>)

    recordCounter(`funnel.${parsed.data.event}`, 1)
    return apiSuccess({ ok: true } as Record<string, unknown>)
  },
  createSimpleGuard({ route: '/api/track/funnel', limit: 120, windowSeconds: 60 })
)
