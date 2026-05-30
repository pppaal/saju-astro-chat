import { NextRequest, NextResponse } from 'next/server'
import { cacheGet, cacheDel } from '@/lib/cache/redis-cache'
import {
  guestRefundMarkerKey,
  GUEST_DESTINY_TURN_COOKIE_NAME,
  buildGuestDestinyTurnCookieFromValue,
} from '../route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * 게스트 카운터 refund — 답변 실패 / mid-stream abort 시 게스트가 깎인 무료
 * 턴을 돌려받는다.
 *
 * 흐름:
 *   1) realtime POST 시작 → SSE response 헤더에 cookie counter +1 set.
 *   2) stream mid-failure → realtime 의 onFailure 가 redis 에
 *      guestRefundMarkerKey(turnId) 저장 (TTL 60s).
 *   3) 클라이언트가 SSE error/empty 감지 → 이 endpoint 호출.
 *   4) 여기서 marker 확인 (replay 방지 위해 즉시 삭제) + cookie counter -1 set.
 *
 * Abuse 방지:
 *   - marker 없으면 410 (refund 불가). 클라가 임의로 호출해도 카운터 안 깎임.
 *   - marker 는 onFailure 가 발동된 turn 만 존재. 정상 답변엔 없음.
 *   - turnId 당 한 번만 (cacheDelete).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { turnId?: unknown }
  try {
    body = (await req.json()) as { turnId?: unknown }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const turnId = typeof body.turnId === 'string' ? body.turnId.slice(0, 80) : ''
  if (!turnId) {
    return NextResponse.json({ error: 'turnId_required' }, { status: 400 })
  }

  const marker = await cacheGet<string>(guestRefundMarkerKey(turnId))
  if (!marker) {
    // 정상 답변 turn 또는 marker TTL 만료 — refund 자격 없음.
    return NextResponse.json({ error: 'no_refund_eligible' }, { status: 410 })
  }

  // 카운터 현재 값 읽어 -1 (최소 0).
  const raw = req.cookies.get(GUEST_DESTINY_TURN_COOKIE_NAME)?.value
  const current = raw ? Math.max(0, parseInt(raw, 10) || 0) : 0
  const next = Math.max(0, current - 1)

  const res = NextResponse.json({ ok: true, refunded: true, current: next })
  res.headers.set('Set-Cookie', buildGuestDestinyTurnCookieFromValue(next))

  // replay 방지 — marker 삭제.
  try {
    await cacheDel(guestRefundMarkerKey(turnId))
  } catch {
    /* delete 실패는 무시 — TTL 60s 라 자동 소멸 */
  }

  return res
}
