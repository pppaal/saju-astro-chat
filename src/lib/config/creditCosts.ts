// src/lib/config/creditCosts.ts
// 기능별 크레딧 소모량 — single source of truth.
//
// 팩 가격/구성은 pricing.ts 가 SSOT 이고, "한 번 쓸 때 몇 크레딧 나가는지"는
// 이 파일이 SSOT 다. 과금 라우트와 UI(스프레드 선택 화면 등)가 전부 여기서
// 읽으므로, 소모량 정책을 바꿀 땐 이 파일만 수정하면 된다.
//
// 현재 위계 (2026-07 확정):
//   타로 리딩 1~3장 = 1 · 5~7장 = 2 (LLM 토큰 비용 ~3-4배)
//   타로 후속질문·클래리파이어 = 질문당 1
//   운명 상담사 채팅 = 턴당 1
//   궁합 상담사 채팅 = 턴당 1
//   데일리 타로 = 0 (무료 — 일일 재방문 훅. 라우트가 아예 과금하지 않음)
//   커플 타로 = 0 (무료 — LLM 미사용 결정적 엔진)
export const CREDIT_COSTS = {
  tarotReading: {
    /** 1~3장 스프레드 */
    small: 1,
    /** largeSpreadMinCards 장 이상 스프레드 */
    large: 2,
    /** 이 카드 수부터 large 요금 적용 */
    largeSpreadMinCards: 5,
  },
  /** 타로 후속질문·클래리파이어 — 질문 1개당 */
  tarotFollowup: 1,
  /** 운명 상담사(counselor/realtime) — 질문 턴당 */
  counselorTurn: 1,
  /** 궁합 상담사(compatibility/counselor) — 질문 턴당 */
  compatibilityTurn: 1,
  /** 데일리 타로 — 무료 (라우트에 과금 코드 없음; 정책 문서화용) */
  dailyTarot: 0,
} as const
