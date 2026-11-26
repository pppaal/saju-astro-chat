/**
 * 퍼널 이벤트 allowlist — 단일 출처(SSOT).
 *
 * /api/track/funnel 의 z.enum 과 클라이언트 비콘(trackFunnel)의 FunnelEvent 타입이 이
 * 한 배열에서 나온다. 예전엔 두 파일이 같은 목록을 따로 들고 "동일하게 유지" 주석으로만
 * 묶여 있었다. 새 단계는 여기에만 추가한다 — 카디널리티 폭주를 막는 고정 목록이다.
 *
 * 클라이언트·서버 공용(서버 전용 import 금지).
 */

export const FUNNEL_EVENTS = [
  // 무료 리포트·궁합 결과 화면과 상담사 CTA.
  'integrated_report.viewed',
  'integrated_report.counselor_cta',
  'compat_free.report_viewed',
  'compat_free.counselor_cta',
  'referral.link_clicked',
  // 추천 루프 시작점 — 무료 결과 화면에서 "친구 초대" 버튼 클릭.
  // invite_clicked → (친구) link_clicked → 첫 결제 보상으로 루프를 계측.
  'referral.invite_clicked',
  // 바이럴 루프 계측 — 공유 의도(클릭)부터 초대 랜딩→프리필→결과 완주까지.
  // k(바이럴 계수) = share_clicked→(서버 share.created)→invite_landed→invite_converted.
  'compat_free.share_clicked',
  // 공유 경로 분리 — 링크 공유(재유입 큰 경로) vs 이미지 저장/공유를 따로 잰다.
  'compat_free.share_link',
  'compat_free.share_image',
  'compat_free.invite_landed',
  'compat_free.invite_prefilled',
  'compat_free.invite_converted',
  'integrated_report.share_clicked',
  // 리포트 바이럴 루프 — 공유 링크(/r)로 온 친구가 리포트 랜딩→자기 리포트 완주.
  // k_report = share_clicked→invite_landed→invite_converted(궁합과 대칭).
  'integrated_report.invite_landed',
  'integrated_report.invite_converted',
  // /destiny 인생유형 공유 — 링크(재유입 큰 경로) vs 이미지 카드(스토리용)를 분리 계측.
  'destiny.share_link',
  'destiny.share_image',
  // v9 홈 — 주 CTA, 출생 정보 저장, 로그인, Explore 행 클릭(제품별).
  'home.cta_clicked',
  'home.birth_saved',
  'home.signin_clicked',
  'home.explore.life',
  'home.explore.calendar',
  'home.explore.tarot',
  'home.explore.compat',
  'home.explore.report',
  'home.explore.counselor',
  // v9 인생 흐름(/destiny)·캘린더 — 유료 상담사로 가는 CTA.
  'destiny.counselor_cta',
  'calendar.counselor_cta',
] as const

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number]
