---
title: 타로 상담사 (Tarot Counselor)
tags: [service, tarot]
status: living
---

# 🔮 타로 상담사 (Tarot Counselor)

카드 뽑기 → AI 해석 → 후속 질문. 서비스 ID `tarot`, 경로 `/tarot`.

## 교리

- [[tarot-doctrine|타로 교리]] _(예정: 덱 78장 / 동적 스프레드 / 비용 룰)_

## 구현

- 뽑기: [`src/app/api/tarot/route.ts`](../../src/app/api/tarot/route.ts)
- 해석(SSE): [`src/app/api/tarot/interpret-stream/route.ts`](../../src/app/api/tarot/interpret-stream/route.ts)
- 후속/사전체크: `followup`, `prefetch` · 스프레드 SSOT: [`tarot-spreads-data.ts`](../../src/lib/tarot/tarot-spreads-data.ts)

## 게이팅 & 비용

- **로그인 필수** (비로그인 401 → blur 로그인 모달)
- 카드 수에 따라 1~2 크레딧 — [[credits|크레딧 & 비용]] 표 참조

## 관련

- [[api-routes]] · [[credits]]
