/**
 * 클라이언트 퍼널 비콘 — 무료 리포트 결과 화면/CTA 클릭처럼 서버 카운터를 직접
 * 못 부르는 클라 컴포넌트에서 호출한다. /api/track/funnel 이 화이트리스트된
 * 이벤트만 받아 `funnel.<event>` 카운터로 집계한다.
 *
 * best-effort: 실패해도 사용자 흐름에 영향 없음. keepalive 로 네비게이션 직전
 * (CTA 클릭→이동)에도 전송이 끊기지 않게 한다.
 */

// 이벤트 allowlist 는 funnelEvents.ts 한 곳 — 서버 라우트의 z.enum 과 같은 배열에서 나온 타입.
import type { FunnelEvent } from './funnelEvents'

export type { FunnelEvent }

export function trackFunnel(event: FunnelEvent): void {
  try {
    void fetch('/api/track/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
      keepalive: true,
      cache: 'no-store',
    }).catch(() => {})
  } catch {
    /* noop — tracking is non-critical */
  }
}
