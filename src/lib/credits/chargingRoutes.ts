// src/lib/credits/chargingRoutes.ts
//
// 크레딧을 실제로 차감(실패 시 환불)하는 내부 API 라우트 — 단일 출처(SSOT).
//  - 클라이언트: apiFetch(@/lib/api/ApiClient)가 이 apiPath 로 보낸 POST 응답을 받으면
//    잔액 위젯 갱신 신호(CREDIT_UPDATE_EVENT)를 쏜다.
//  - 가드: tests/paid-routes-money-guards.test.ts 가 file 의 소스를 읽어 환불 경로를
//    강제하고, consumeCredits/checkAndConsumeCredits 를 부르는 route.ts 가 전부 이
//    목록에 있는지 검사한다. 차감 라우트를 추가하면 여기에만 추가하면 된다.
//
// 클라이언트 번들에도 들어가므로 순수 데이터만 둔다 (서버 전용 import 금지).

export interface ChargingRoute {
  /** 클라이언트가 호출하는 경로 (예: '/api/tarot/followup'). */
  readonly apiPath: string
  /** 레포 루트 기준 라우트 핸들러 파일 경로. */
  readonly file: string
}

export const CHARGING_ROUTES: readonly ChargingRoute[] = [
  { apiPath: '/api/tarot/interpret-stream', file: 'src/app/api/tarot/interpret-stream/route.ts' },
  { apiPath: '/api/tarot/followup', file: 'src/app/api/tarot/followup/route.ts' },
  { apiPath: '/api/counselor/realtime', file: 'src/app/api/counselor/realtime/route.ts' },
  { apiPath: '/api/compatibility/counselor', file: 'src/app/api/compatibility/counselor/route.ts' },
]
