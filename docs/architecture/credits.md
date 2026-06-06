---
title: 크레딧 & 비용 (Credits)
tags: [architecture, credits]
status: living
---

# 💳 크레딧 & 비용 (Credits)

모든 AI 리딩은 크레딧을 소비합니다. 게이트는 `checkAndConsumeCredits` /
`checkCreditsOnly` ([`src/lib/credits/withCredits.ts`](../../src/lib/credits/withCredits.ts)),
환불은 `refundCreditsOnce` (멱등).

## 타로 스프레드 비용

<!-- gen:tarot-costs -->
<!-- 이 표는 자동 생성됩니다. 직접 수정하지 마세요 — `npm run docs:sync`. -->

**원천:** [`src/lib/tarot/tarot-spreads-data.ts`](../../src/lib/tarot/tarot-spreads-data.ts)

| 스프레드                  | 카드 수 | 비용     |
| ------------------------- | ------- | -------- |
| 1장 리딩 / 1-Card Reading | 1       | 1 크레딧 |
| 2장 리딩 / 2-Card Reading | 2       | 1 크레딧 |
| 3장 리딩 / 3-Card Reading | 3       | 1 크레딧 |
| 5장 리딩 / 5-Card Reading | 5       | 2 크레딧 |
| 7장 리딩 / 7-Card Reading | 7       | 2 크레딧 |

<!-- /gen:tarot-costs -->

## 상담사 비용

- 운명 상담사 · 궁합 상담사: 메시지당 **1 크레딧**

## 무료 (로그인 불필요)

- 운세 캘린더 (이번 달) — [[services-index|서비스 인덱스]] 참조

## 관련 서비스

- [[destiny-counselor|운명 상담사]]
