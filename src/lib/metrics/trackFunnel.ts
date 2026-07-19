/**
 * 클라이언트 퍼널 비콘 — 무료 리포트 결과 화면/CTA 클릭처럼 서버 카운터를 직접
 * 못 부르는 클라 컴포넌트에서 호출한다. /api/track/funnel 이 화이트리스트된
 * 이벤트만 받아 `funnel.<event>` 카운터로 집계한다.
 *
 * best-effort: 실패해도 사용자 흐름에 영향 없음. keepalive 로 네비게이션 직전
 * (CTA 클릭→이동)에도 전송이 끊기지 않게 한다.
 */

// 서버 라우트의 allowlist 와 동일하게 유지(타입으로 오타 방지).
export type FunnelEvent =
  | 'integrated_report.viewed'
  | 'integrated_report.counselor_cta'
  | 'compat_free.report_viewed'
  | 'compat_free.counselor_cta'
  | 'referral.link_clicked'
  // 추천 루프 시작점 — 무료 결과 화면에서 "친구 초대" 버튼 클릭.
  // invite_clicked → (친구) link_clicked → 첫 결제 보상으로 루프를 계측.
  | 'referral.invite_clicked'
  // 바이럴 루프 계측 — 공유 의도(클릭)부터 초대 랜딩→프리필→결과 완주까지.
  // k(바이럴 계수) = share_clicked→(서버 share.created)→invite_landed→invite_converted 로 계산.
  | 'compat_free.share_clicked'
  // 공유 경로 분리 — 링크 공유(재유입 큰 경로) vs 이미지 저장/공유를 따로 잰다.
  | 'compat_free.share_link'
  | 'compat_free.share_image'
  | 'compat_free.invite_landed'
  | 'compat_free.invite_prefilled'
  | 'compat_free.invite_converted'
  | 'integrated_report.share_clicked'
  // 리포트 바이럴 루프 — 공유 링크(/r)로 온 친구가 리포트 랜딩→자기 리포트 완주.
  // k_report = share_clicked→invite_landed→invite_converted 로 계산(궁합과 대칭).
  | 'integrated_report.invite_landed'
  | 'integrated_report.invite_converted'
  // /destiny 인생유형 공유 — 링크(재유입 큰 경로) vs 이미지 카드(스토리용)를 분리 계측.
  | 'destiny.share_link'
  | 'destiny.share_image'

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
