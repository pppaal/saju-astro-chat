---
title: 궁합 상담사 (Compatibility Counselor)
tags: [service, compatibility, saju, astrology]
status: living
---

# 💕 궁합 상담사 (Compatibility Counselor)

두 사람의 사주 cross + 점성 synastry 를 통합한 AI 궁합 상담. 서비스 ID
`compatibility`, 경로 `/compatibility`.

## 교리 (운명 상담사와 계산 공유)

- [[saju|사주 교리]] — 합/충/신살 cross
- [[astrology|점성 교리]] — synastry / composite chart

## 구현

- 라우트: [`src/app/api/compatibility/counselor/route.ts`](../../src/app/api/compatibility/counselor/route.ts)
- 사주 cross 포맷: `sajuSynastryFormatter` · 점성: `synastry.ts` / `compositeChartFormatter`
- 개인 사주 facts 재사용: `collectSajuFacts` ([[destiny-counselor|운명 상담사]]와 SSOT 공유)

## 게이팅 & 비용

- **로그인 필수** (authed guard, 비로그인 401)
- 메시지당 1 크레딧 — [[credits|크레딧 & 비용]]

## 관련

- [[destiny-counselor]] · [[api-routes]]
