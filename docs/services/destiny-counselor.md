---
title: 운명 상담사 (Destiny Counselor)
tags: [service, destiny, saju, astrology]
status: living
---

# 🗺️ 운명 상담사 (Destiny Counselor)

사주 + 점성을 통합한 AI 실시간 상담 채팅. 서비스 ID `destinyMap`, 경로 `/destiny-counselor`.

## 교리 (이 서비스가 따르는 계산)

- [[saju|사주 교리]]
- [[astrology|점성 교리]]
- [[calculation-standards|계산 표준]] ⚙️

## 구현

- 라우트: [`src/app/api/counselor/realtime/route.ts`](../../src/app/api/counselor/realtime/route.ts) (SSE 스트리밍)
- 끊김 복구: `result` 엔드포인트 + turnId Redis 캐시
- 클라/훅: [`src/components/destiny-map/`](../../src/components/destiny-map/) (`Chat.tsx`, `hooks/useChatApi.ts`)
- 프롬프트: [`src/lib/prompts/destinyCounselorPrompt.ts`](../../src/lib/prompts/destinyCounselorPrompt.ts)

## 게이팅 & 비용

- **로그인 필수** (비로그인 401 → blur 로그인 모달). 게스트 폐지(2026-06).
- 메시지당 1 크레딧 — [[credits|크레딧 & 비용]] 참조
- Rate limit: 12/min (userId 기준)

## 신뢰성

- `keepGeneratingOnDisconnect`: 클라 끊겨도 서버 끝까지 생성 후 캐시
- 멱등 차감(idempotency key) + 실패 시 `refundCreditsOnce` 환불

## 관련

- 횡단: [[credits]] · 레퍼런스: [[api-routes]]
