---
title: API 라우트 인벤토리 (API Routes)
tags: [reference, api, auto]
status: auto-generated
---

# ⚙️ API 라우트 인벤토리 (API Routes)

`src/app/api/**/route.ts` 파일시스템에서 자동 수집. 라우트가 추가/삭제되면
`npm run docs:sync` 로 갱신됩니다 (CI 가 어긋남을 차단).

> 여기는 **인벤토리**(무엇이 있나). 보안 감사(인증·검증·public mutation)는
> [[API_AUDIT_REPORT]] 참조 — `npm run audit:api` 로 생성.

<!-- gen:api-routes -->
<!-- 이 표는 자동 생성됩니다. 직접 수정하지 마세요 — `npm run docs:sync`. -->

**총 71개 라우트** (원천: `src/app/api/**/route.ts`)

| 라우트                                  | 메서드             |
| --------------------------------------- | ------------------ |
| `/api/admin/active-users`               | GET                |
| `/api/admin/anomalies`                  | GET                |
| `/api/admin/audit-log`                  | GET                |
| `/api/admin/funnel`                     | GET                |
| `/api/admin/grant-credits`              | POST               |
| `/api/admin/metrics`                    | GET                |
| `/api/admin/metrics/funnel`             | GET                |
| `/api/admin/overview`                   | GET                |
| `/api/admin/purchases`                  | GET                |
| `/api/admin/refund-credit-pack`         | POST               |
| `/api/admin/revenue`                    | GET                |
| `/api/admin/usage`                      | GET                |
| `/api/admin/users`                      | GET                |
| `/api/admin/users-by`                   | GET                |
| `/api/admin/users/[id]`                 | GET                |
| `/api/admin/webhook-events`             | GET                |
| `/api/astrology`                        | POST               |
| `/api/astrology/advanced/asteroids`     | POST               |
| `/api/astrology/advanced/draconic`      | POST               |
| `/api/astrology/advanced/eclipses`      | POST               |
| `/api/astrology/advanced/fixed-stars`   | POST               |
| `/api/astrology/advanced/harmonics`     | POST               |
| `/api/astrology/advanced/lunar-return`  | POST               |
| `/api/astrology/advanced/midpoints`     | POST               |
| `/api/astrology/advanced/progressions`  | POST               |
| `/api/astrology/advanced/solar-return`  | POST               |
| `/api/auth/[...nextauth]`               | GET, POST          |
| `/api/auth/revoke`                      | POST               |
| `/api/checkout`                         | POST               |
| `/api/cities`                           | GET                |
| `/api/compatibility/counselor`          | POST               |
| `/api/compatibility/counselor/result`   | GET                |
| `/api/compatibility/report`             | POST               |
| `/api/counselor/chat-history`           | GET, POST, PATCH   |
| `/api/counselor/realtime`               | POST               |
| `/api/counselor/realtime/result`        | GET                |
| `/api/counselor/session/list`           | GET, PATCH, DELETE |
| `/api/counselor/session/load`           | GET                |
| `/api/counselor/session/save`           | POST               |
| `/api/counselor/warm`                   | POST               |
| `/api/cron/reset-credits`               | GET, POST          |
| `/api/csp-report`                       | GET, POST          |
| `/api/db-ping`                          | GET                |
| `/api/me`                               | GET                |
| `/api/me/account`                       | DELETE             |
| `/api/me/circle`                        | GET, POST, DELETE  |
| `/api/me/credit-rewards`                | GET, POST          |
| `/api/me/credits`                       | GET, POST          |
| `/api/me/credits/history`               | GET                |
| `/api/me/email`                         | PATCH              |
| `/api/me/legal-consent`                 | GET, POST          |
| `/api/me/profile`                       | GET, PATCH         |
| `/api/me/purchases`                     | GET                |
| `/api/me/refund-credit-pack`            | POST               |
| `/api/me/upload-photo`                  | POST               |
| `/api/referral/claim`                   | POST               |
| `/api/referral/create-code`             | POST               |
| `/api/referral/link`                    | POST               |
| `/api/referral/me`                      | GET                |
| `/api/saju`                             | POST               |
| `/api/share/[id]`                       | GET                |
| `/api/tarot`                            | POST               |
| `/api/tarot/couple-reading`             | GET, POST, DELETE  |
| `/api/tarot/couple-reading/[readingId]` | GET                |
| `/api/tarot/followup`                   | POST               |
| `/api/tarot/interpret-stream`           | POST               |
| `/api/tarot/interpret-stream/result`    | GET                |
| `/api/tarot/prefetch`                   | POST               |
| `/api/tarot/save`                       | GET, POST          |
| `/api/tarot/save/[id]`                  | GET, PATCH, DELETE |
| `/api/webhook/stripe`                   | POST               |

<!-- /gen:api-routes -->
